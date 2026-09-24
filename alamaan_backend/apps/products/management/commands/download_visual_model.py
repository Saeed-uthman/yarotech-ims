"""Explicit one-time setup download, never called by request handlers."""
import os
from pathlib import Path
import tempfile
from urllib.request import urlopen

from django.core.management.base import BaseCommand, CommandError
from apps.products.visual_search import MODEL_URL, MODEL_SHA256, data_dir, file_digest, index_lock


class Command(BaseCommand):
    help = 'Download the pinned public CLIP ONNX weights (89 MB), verifying SHA-256. No photos are uploaded.'

    def handle(self, *args, **options):
        with index_lock():
            destination = data_dir() / 'vision.onnx'
            if destination.exists() and file_digest(destination) == MODEL_SHA256:
                self.stdout.write('Verified local model already exists.')
                return
            temporary = None
            try:
                with urlopen(MODEL_URL, timeout=60) as source, tempfile.NamedTemporaryFile(dir=data_dir(), delete=False) as output:
                    temporary = Path(output.name)
                    size = 0
                    while chunk := source.read(1024 * 1024):
                        size += len(chunk)
                        if size > 100_000_000:
                            raise CommandError('Model download exceeded expected size.')
                        output.write(chunk)
                if file_digest(temporary) != MODEL_SHA256:
                    raise CommandError('Model checksum mismatch. Existing model was preserved.')
                os.replace(temporary, destination)
                self.stdout.write('Local recognition model downloaded and verified.')
            except OSError as exc:
                raise CommandError('Model download failed. Check server network access and try again.') from exc
            finally:
                if temporary and temporary.exists():
                    temporary.unlink()
