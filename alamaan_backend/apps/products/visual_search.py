"""CPU-only catalogue retrieval. Runtime inference never accesses the network.

The immutable ONNX file is downloaded separately by an explicit setup command.
The index is a derived, replaceable artifact, not an inventory source of truth.
"""
from contextlib import contextmanager
from functools import lru_cache
import hashlib
import json
import logging
import os
from pathlib import Path
import tempfile
import threading
from zipfile import BadZipFile

from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError

from .models import Product
from .visual_images import read_product_photo, MAX_BYTES

logger = logging.getLogger(__name__)
MODEL_REVISION = '6ef1ebc8b0766a7a8d11b146462c99cdf74dd22d'
MODEL_SHA256 = '583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299'
MODEL_URL = f'https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/{MODEL_REVISION}/onnx/vision_model_quantized.onnx'
MODEL_VERSION = MODEL_SHA256 + ':clip224-v1'
_inference_slot = threading.BoundedSemaphore(1)


class VisualSearchUnavailable(APIException):
    status_code = 503
    default_detail = 'Photo search is not ready. Ask an administrator to configure the local model and photo index.'
    default_code = 'PHOTO_SEARCH_UNAVAILABLE'


class VisualSearchBusy(APIException):
    status_code = 503
    default_detail = 'Photo search is busy. Please try again shortly.'
    default_code = 'PHOTO_SEARCH_BUSY'


def data_dir():
    return Path(settings.VISUAL_SEARCH_DIR)


def file_digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def numpy_module():
    try:
        import numpy
        return numpy
    except ImportError as exc:
        raise VisualSearchUnavailable() from exc


@lru_cache(maxsize=1)
def model_session(model_path, threads):
    try:
        import onnxruntime as ort
        if file_digest(model_path) != MODEL_SHA256:
            raise VisualSearchUnavailable('Local recognition model failed its integrity check.')
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        options.add_session_config_entry('session.intra_op.allow_spinning', '0')
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        return ort.InferenceSession(str(model_path), sess_options=options, providers=['CPUExecutionProvider'])
    except VisualSearchUnavailable:
        raise
    except Exception as exc:
        logger.error('photo_search_model_unavailable error_type=%s', type(exc).__name__)
        raise VisualSearchUnavailable() from exc


def embed(image):
    np = numpy_module()
    # Matches the pinned CLIP preprocessor: bicubic shortest-edge resize, center
    # crop, RGB float32 rescale and the model's published mean/std.
    from PIL import Image
    width, height = image.size
    scale = 224 / min(width, height)
    resized = image.resize((max(224, int(width * scale)), max(224, int(height * scale))), Image.Resampling.BICUBIC)
    left, top = (resized.width - 224) // 2, (resized.height - 224) // 2
    pixels = np.asarray(resized.crop((left, top, left + 224, top + 224)), dtype=np.float32) / 255.0
    pixels = (pixels - np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)) / np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
    session = model_session(data_dir() / 'vision.onnx', max(1, min(settings.VISUAL_SEARCH_THREADS, 4)))
    try:
        vector = session.run(['image_embeds'], {'pixel_values': pixels.transpose(2, 0, 1)[None].copy()})[0][0]
    except Exception as exc:
        logger.error('photo_search_inference_failed error_type=%s', type(exc).__name__)
        raise VisualSearchUnavailable() from exc
    norm = np.linalg.norm(vector)
    if not np.isfinite(vector).all() or norm <= 0:
        raise VisualSearchUnavailable('Photo matching could not process this image. Try a different photo.')
    return (vector / norm).astype(np.float32)


@contextmanager
def index_lock():
    data_dir().mkdir(parents=True, exist_ok=True)
    with (data_dir() / 'index.lock').open('a+b') as lock:
        try:
            if os.name == 'nt':
                import msvcrt
                lock.seek(0)
                if not lock.read(1):
                    lock.write(b'0')
                    lock.flush()
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise VisualSearchBusy('Another catalogue photo index refresh is running.') from exc
        yield


def load_index():
    np = numpy_module()
    try:
        with np.load(data_dir() / 'index.npz', allow_pickle=False) as stored:
            meta = json.loads(str(stored['metadata'].item()))
            vectors = stored['vectors'].copy()
        if meta['model'] != MODEL_VERSION or vectors.shape != (len(meta['rows']), 512) or not np.isfinite(vectors).all():
            raise ValueError('incompatible index')
        return meta['rows'], vectors
    except (OSError, ValueError, KeyError, EOFError, BadZipFile, TypeError) as exc:
        raise VisualSearchUnavailable() from exc


def rebuild_index():
    np = numpy_module()
    with index_lock():
        try:
            old_rows, old_vectors = load_index()
            previous = {(row['id'], row['image'], row['digest']): old_vectors[i] for i, row in enumerate(old_rows)}
        except VisualSearchUnavailable:
            previous = {}
        rows, vectors, skipped = [], [], []
        root = Path(settings.MEDIA_ROOT).resolve()
        products = Product.objects.filter(status=Product.Status.ACTIVE).exclude(image='').exclude(image__isnull=True).order_by('id')
        if products.count() > settings.VISUAL_SEARCH_MAX_PRODUCTS:
            raise VisualSearchUnavailable('Catalogue exceeds the configured photo index capacity.')
        for product in products.iterator(chunk_size=100):
            try:
                # Only local catalogue media; never follow an image URL or read
                # a symlink/path escaping MEDIA_ROOT.
                path = (root / product.image.name).resolve()
                if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size > MAX_BYTES:
                    raise OSError('not local catalogue media')
                digest = file_digest(path)
                key = (product.pk, product.image.name, digest)
                vector = previous.get(key)
                if vector is None:
                    with path.open('rb') as source:
                        vector = embed(read_product_photo(source))
                rows.append({'id': product.pk, 'image': product.image.name, 'digest': digest})
                vectors.append(vector)
            except (OSError, ValidationError):
                skipped.append(product.pk)
        matrix = np.stack(vectors) if vectors else np.empty((0, 512), dtype=np.float32)
        filename = None
        try:
            with tempfile.NamedTemporaryFile(dir=data_dir(), suffix='.npz', delete=False) as output:
                filename = output.name
                np.savez_compressed(output, metadata=json.dumps({'model': MODEL_VERSION, 'rows': rows}), vectors=matrix)
                output.flush()
                os.fsync(output.fileno())
            os.replace(filename, data_dir() / 'index.npz')
        finally:
            if filename and Path(filename).exists():
                Path(filename).unlink()
        logger.info('photo_index_refreshed indexed=%s skipped=%s', len(rows), len(skipped))
        return {'indexed': len(rows), 'skipped_product_ids': skipped}


def search_photo(image):
    if not settings.VISUAL_SEARCH_ENABLED:
        raise VisualSearchUnavailable()
    if not _inference_slot.acquire(blocking=False):
        raise VisualSearchBusy()
    try:
        rows, vectors = load_index()
        # Resolve eligibility before ranking, so removed/replaced/inactive photos
        # cannot crowd eligible candidates out of the top results.
        products = list(Product.objects.filter(pk__in=[r['id'] for r in rows], status=Product.Status.ACTIVE)
                        .select_related('category').prefetch_related('variants__company'))
        current = {p.pk: p for p in products}
        eligible = [i for i, row in enumerate(rows) if row['id'] in current and current[row['id']].image.name == row['image']]
        if not eligible:
            return [], 0
        scores = vectors[eligible] @ embed(image)
        np = numpy_module()
        ranked = np.argsort(-scores, kind='stable')[:5]
        matches = []
        for position in ranked:
            score = float(scores[position])
            if score < settings.VISUAL_SEARCH_MIN_SIMILARITY:
                continue
            product = current[rows[eligible[position]]['id']]
            matches.append((product, round(score, 4)))
        return matches, len(eligible)
    finally:
        _inference_slot.release()
