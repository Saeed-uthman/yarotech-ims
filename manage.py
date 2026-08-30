#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def main():
    """Run administrative tasks."""
    backend_dir = Path(__file__).resolve().parent / 'alamaan_backend'
    sys.path.insert(0, str(backend_dir))
    # Django's label-free test discovery starts from the current directory.
    # Anchor only the test command to the backend so the root convenience
    # launcher discovers the same suite as alamaan_backend/manage.py.
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        os.chdir(backend_dir)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
