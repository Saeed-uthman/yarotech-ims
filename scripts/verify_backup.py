"""Verify a pharmacy backup archive without changing any live data."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    archive_path = args.archive.resolve()
    if not archive_path.is_file():
        raise FileNotFoundError(f"Backup archive not found: {archive_path}")

    with zipfile.ZipFile(archive_path) as archive:
        corrupt = archive.testzip()
        if corrupt:
            raise RuntimeError(f"Corrupt ZIP member: {corrupt}")
        manifest = json.loads(archive.read("backup-manifest.json"))
        database_member = manifest["database_file"]
        with tempfile.TemporaryDirectory(prefix="alamaan-verify-") as temp:
            if database_member not in archive.namelist():
                raise RuntimeError("Manifest database member is missing from the archive.")
            database_path = Path(temp) / "database-backup"
            with archive.open(database_member) as source, database_path.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            actual = sha256(database_path)
            if actual != manifest["database_sha256"]:
                raise RuntimeError("Database SHA-256 does not match the backup manifest.")
            if manifest["database_engine"] == "postgresql":
                root = Path(__file__).resolve().parents[1]
                configured = ""
                for env_path in (root / ".env", root / "alamaan_backend" / ".env"):
                    if not env_path.exists():
                        continue
                    for raw in env_path.read_text(encoding="utf-8-sig").splitlines():
                        if raw.strip().startswith("POSTGRES_BIN="):
                            configured = raw.split("=", 1)[1].strip().strip("\"'")
                            break
                    if configured:
                        break
                configured_tool = Path(configured) / "pg_restore.exe" if configured else None
                pg_restore = str(configured_tool) if configured_tool and configured_tool.is_file() else (shutil.which("pg_restore") or shutil.which("pg_restore.exe"))
                if not pg_restore:
                    raise FileNotFoundError("pg_restore is required to verify a PostgreSQL dump structure.")
                result = subprocess.run([pg_restore, "--list", str(database_path)], check=True, capture_output=True, text=True)
                if not result.stdout.strip():
                    raise RuntimeError("pg_restore returned an empty archive listing.")

        media_count = sum(1 for name in archive.namelist() if name.startswith("media/") and not name.endswith("/"))
        if media_count != int(manifest.get("media_file_count", 0)):
            raise RuntimeError("Media file count does not match the backup manifest.")

    print(f"Backup verified successfully: {archive_path}")
    print(f"Database engine: {manifest['database_engine']}; media files: {media_count}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Verification failed: {error}", file=sys.stderr)
        raise SystemExit(1)
