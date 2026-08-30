"""Run Django's deployment checks with temporary hardened production settings."""

from __future__ import annotations

import os
import secrets
import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    backend = root / "alamaan_backend"
    command_environment = os.environ.copy()
    command_environment.update({
        "DJANGO_DEBUG": "False",
        "DJANGO_SECRET_KEY": secrets.token_urlsafe(64),
        "DJANGO_ALLOWED_HOSTS": "api.production-check.invalid",
        "CORS_ALLOWED_ORIGINS": "https://app.production-check.invalid",
        "CSRF_TRUSTED_ORIGINS": "https://app.production-check.invalid",
        "DJANGO_TRUST_PROXY_HEADERS": "True",
        "DJANGO_SECURE_SSL_REDIRECT": "True",
        "DJANGO_SESSION_COOKIE_SECURE": "True",
        "DJANGO_CSRF_COOKIE_SECURE": "True",
        "DJANGO_SECURE_HSTS_SECONDS": "31536000",
        "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS": "True",
        "DJANGO_SECURE_HSTS_PRELOAD": "True",
        "DJANGO_ENABLE_API_DOCS": "False",
    })
    result = subprocess.run(
        [sys.executable, "manage.py", "check", "--deploy", "--fail-level", "WARNING"],
        cwd=backend,
        env=command_environment,
    )
    if result.returncode == 0:
        print("Production security gate passed with temporary hardened settings.")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
