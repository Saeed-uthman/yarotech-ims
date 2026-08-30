"""Create and verify a PostgreSQL custom-format dump plus uploaded media archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ARCHIVE_PREFIX = "alamaan-postgres-backup-"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key.strip()] = value
    return values


def resolve_path(value: str, base: Path) -> Path:
    path = Path(value).expanduser()
    return (path if path.is_absolute() else base / path).resolve()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def number(raw: str, default: float, name: str) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        value = default
    if value < 0:
        raise ValueError(f"{name} cannot be negative.")
    return value


def postgres_tool(name: str, environment: dict[str, str]) -> str:
    configured = environment.get("POSTGRES_BIN", "").strip()
    candidates = [str(Path(configured) / f"{name}.exe")] if configured else []
    found = shutil.which(name) or shutil.which(f"{name}.exe")
    if found:
        candidates.append(found)
    for candidate in candidates:
        if Path(candidate).is_file():
            return candidate
    raise FileNotFoundError(
        f"{name} was not found. Add PostgreSQL bin to PATH or set POSTGRES_BIN in .env."
    )


def run_checked(command: list[str], password: str, *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    process_env = os.environ.copy()
    process_env["PGPASSWORD"] = password
    return subprocess.run(
        command,
        env=process_env,
        check=True,
        text=True,
        capture_output=capture,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    backend = root / "alamaan_backend"
    environment = read_env(root / ".env")
    for key, value in read_env(backend / ".env").items():
        environment.setdefault(key, value)
    if environment.get("DB_ENGINE", "sqlite").lower() not in {"postgres", "postgresql"}:
        return 2

    required = ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT"]
    missing = [key for key in required if not environment.get(key)]
    if missing:
        raise ValueError(f"Missing PostgreSQL settings in .env: {', '.join(missing)}")

    backup_dir = resolve_path(environment.get("PHARMACY_BACKUP_DIR", "backups"), root)
    media_dir = resolve_path(environment.get("DJANGO_MEDIA_ROOT", str(backend / "media")), backend)
    retention_days = number(environment.get("PHARMACY_BACKUP_RETENTION_DAYS", "30"), 30, "retention")
    interval_hours = number(environment.get("PHARMACY_BACKUP_MIN_INTERVAL_HOURS", "12"), 12, "interval")
    backup_dir.mkdir(parents=True, exist_ok=True)
    archives = sorted(backup_dir.glob(f"{ARCHIVE_PREFIX}*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    if archives and not args.force and interval_hours and (time.time() - archives[0].stat().st_mtime) / 3600 < interval_hours:
        if not args.quiet:
            print(f"Recent verified backup retained: {archives[0]}")
        return 0

    pg_dump = postgres_tool("pg_dump", environment)
    pg_restore = postgres_tool("pg_restore", environment)
    connection = ["--host", environment["DB_HOST"], "--port", environment["DB_PORT"], "--username", environment["DB_USER"]]
    created_at = datetime.now(timezone.utc)
    timestamp = created_at.astimezone().strftime("%Y%m%d-%H%M%S")
    archive_path = backup_dir / f"{ARCHIVE_PREFIX}{timestamp}.zip"
    temporary_archive = backup_dir / f".{archive_path.name}.tmp"

    with tempfile.TemporaryDirectory(prefix="alamaan-postgres-backup-") as temp:
        dump_path = Path(temp) / "database.dump"
        run_checked([pg_dump, *connection, "--format=custom", "--compress=6", "--no-owner", "--no-acl", "--file", str(dump_path), environment["DB_NAME"]], environment["DB_PASSWORD"])
        listing = run_checked([pg_restore, "--list", str(dump_path)], environment["DB_PASSWORD"], capture=True)
        if not dump_path.is_file() or dump_path.stat().st_size == 0 or not listing.stdout.strip():
            raise RuntimeError("PostgreSQL dump verification failed.")

        media_files = sorted(path for path in media_dir.rglob("*") if path.is_file()) if media_dir.exists() else []
        manifest = {
            "application": "Al-Amaan Pharmacy IMS",
            "backup_format": 2,
            "created_at_utc": created_at.isoformat(),
            "database_engine": "postgresql",
            "database_name": environment["DB_NAME"],
            "database_file": "database/database.dump",
            "database_sha256": sha256_file(dump_path),
            "pg_restore_list_entries": len(listing.stdout.splitlines()),
            "media_directory": "media/",
            "media_file_count": len(media_files),
        }
        try:
            with zipfile.ZipFile(temporary_archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
                archive.write(dump_path, "database/database.dump")
                for media_file in media_files:
                    archive.write(media_file, Path("media") / media_file.relative_to(media_dir))
                archive.writestr("backup-manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
            with zipfile.ZipFile(temporary_archive) as archive:
                if archive.testzip() is not None:
                    raise RuntimeError("ZIP integrity verification failed.")
            os.replace(temporary_archive, archive_path)
        finally:
            temporary_archive.unlink(missing_ok=True)

    if retention_days:
        cutoff = time.time() - retention_days * 86400
        for old_archive in backup_dir.glob(f"{ARCHIVE_PREFIX}*.zip"):
            if old_archive != archive_path and old_archive.stat().st_mtime < cutoff:
                old_archive.unlink()
    if not args.quiet:
        print(f"Verified PostgreSQL and media backup created: {archive_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"Backup command failed with exit code {error.returncode}.", file=sys.stderr)
        if error.stderr:
            print(error.stderr.strip(), file=sys.stderr)
        raise SystemExit(1)
    except Exception as error:
        print(f"Backup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
