"""Validate and sanitize images without fetching URLs or preserving EXIF data."""
from io import BytesIO
import warnings

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_BYTES = 4 * 1024 * 1024
MAX_PIXELS = 12_000_000


def read_product_photo(file):
    if getattr(file, 'size', 0) > MAX_BYTES:
        raise ValidationError({'image': 'Photo must be 4 MB or smaller.'})
    try:
        file.seek(0)
        data = file.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValidationError({'image': 'Photo must be 4 MB or smaller.'})
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as opened:
                if opened.format not in {'JPEG', 'PNG', 'WEBP'} or getattr(opened, 'n_frames', 1) != 1:
                    raise ValidationError({'image': 'Use a single JPEG, PNG or WebP photo.'})
                if opened.width * opened.height > MAX_PIXELS or min(opened.size) < 32:
                    raise ValidationError({'image': 'Photo must be at least 32 pixels per side and at most 12 megapixels.'})
                if max(opened.size) / min(opened.size) > 8:
                    raise ValidationError({'image': 'Use a regular product photo, not a very narrow panoramic image.'})
                opened.load()
                return ImageOps.exif_transpose(opened).convert('RGB')
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ValidationError({'image': 'Upload a valid JPEG, PNG or WebP photo.'}) from exc
    finally:
        file.seek(0)


def sanitized_product_photo(file):
    if file is None:
        return None
    image = read_product_photo(file)
    image.thumbnail((1600, 1600))
    output = BytesIO()
    image.save(output, format='JPEG', quality=90)
    return ContentFile(output.getvalue(), name='product.jpg')
