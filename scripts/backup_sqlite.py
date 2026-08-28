"""Create a verified SQLite and media backup without stopping Django."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ARCHIVE_PREFIX = "alamaan-local-backup-"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.lower().startswith("export "):
            line = line[7:].lstrip()
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def resolve_path(value: str, base: Path) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = base / path
    return path.resolve()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def positive_number(raw: str, default: float, name: str) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        value = default
    if value < 0:
        raise ValueError(f"{name} cannot be negative.")
    return value


def existing_archives(backup_dir: Path) -> list[Path]:
    return sorted(
        backup_dir.glob(f"{ARCHIVE_PREFIX}*.zip"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )


def create_sqlite_snapshot(source_path: Path, destination_path: Path) -> str:
    source = sqlite3.connect(str(source_path), timeout=30)
    destination = sqlite3.connect(str(destination_path), timeout=30)
    try:
        source.backup(destination, pages=256, sleep=0.05)
        result = destination.execute("PRAGMA integrity_check").fetchone()
        integrity_status = str(result[0]) if result else "no result"
        if integrity_status.lower() != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity_status}")
        destination.commit()
        return integrity_status
    finally:
        destination.close()
        source.close()


def prune_expired_archives(backup_dir: Path, retention_days: float) -> int:
    if retention_days == 0:
        return 0

    cutoff = time.time() - (retention_days * 24 * 60 * 60)
    removed = 0
    for archive in existing_archives(backup_dir):
        if archive.stat().st_mtime < cutoff:
            archive.unlink()
            removed += 1
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Create a backup even if a recent automatic backup already exists.",
    )
    parser.add_argument("--quiet", action="store_true", help="Print errors only.")
    args = parser.parse_args()

    repository_root = Path(__file__).resolve().parents[1]
    backend_dir = repository_root / "alamaan_backend"
    environment = read_env(repository_root / ".env")
    database_engine = environment.get("DB_ENGINE", "sqlite").strip().lower()

    if database_engine not in {"sqlite", "sqlite3"}:
        if not args.quiet:
            print(
                "SQLite backup skipped because DB_ENGINE is not sqlite. "
                "Use the PostgreSQL pg_dump backup job for this environment."
            )
        return 2

    database_path = resolve_path(
        environment.get("SQLITE_PATH", str(backend_dir / "db.sqlite3")),
        backend_dir,
    )
    media_dir = resolve_path(
        environment.get("DJANGO_MEDIA_ROOT", str(backend_dir / "media")),
        backend_dir,
    )
    backup_dir = resolve_path(
        environment.get("PHARMACY_BACKUP_DIR", "backups"),
        repository_root,
    )
    retention_days = positive_number(
        environment.get("PHARMACY_BACKUP_RETENTION_DAYS", "30"),
        30,
        "PHARMACY_BACKUP_RETENTION_DAYS",
    )
    minimum_interval_hours = positive_number(
        environment.get("PHARMACY_BACKUP_MIN_INTERVAL_HOURS", "12"),
        12,
        "PHARMACY_BACKUP_MIN_INTERVAL_HOURS",
    )

    if not database_path.is_file():
        raise FileNotFoundError(f"SQLite database not found: {database_path}")

    try:
        backup_dir.relative_to(media_dir)
    except ValueError:
        pass
    else:
        raise ValueError("PHARMACY_BACKUP_DIR must not be inside DJANGO_MEDIA_ROOT.")

    backup_dir.mkdir(parents=True, exist_ok=True)
    archives = existing_archives(backup_dir)
    if archives and not args.force and minimum_interval_hours > 0:
        age_hours = (time.time() - archives[0].stat().st_mtime) / 3600
        if age_hours < minimum_interval_hours:
            if not args.quiet:
                print(f"Recent verified backup retained: {archives[0]}")
            return 0

    created_at = datetime.now(timezone.utc)
    timestamp = created_at.astimezone().strftime("%Y%m%d-%H%M%S")
    archive_path = backup_dir / f"{ARCHIVE_PREFIX}{timestamp}.zip"
    temporary_archive = backup_dir / f".{archive_path.name}.tmp"

    with tempfile.TemporaryDirectory(prefix="alamaan-backup-") as temporary_directory:
        snapshot_path = Path(temporary_directory) / "db.sqlite3"
        integrity_status = create_sqlite_snapshot(database_path, snapshot_path)
        media_files = (
            sorted(path for path in media_dir.rglob("*") if path.is_file())
            if media_dir.exists()
            else []
        )

        manifest = {
            "application": "Al-Amaan Pharmacy IMS",
            "backup_format": 1,
            "created_at_utc": created_at.isoformat(),
            "database_engine": "sqlite",
            "database_file": "database/db.sqlite3",
            "database_sha256": sha256_file(snapshot_path),
            "database_integrity_check": integrity_status,
            "media_directory": "media/",
            "media_file_count": len(media_files),
        }

        try:
            with zipfile.ZipFile(
                temporary_archive,
                mode="w",
                compression=zipfile.ZIP_DEFLATED,
                compresslevel=6,
            ) as archive:
                archive.write(snapshot_path, "database/db.sqlite3")
                for media_file in media_files:
                    archive.write(
                        media_file,
                        Path("media") / media_file.relative_to(media_dir),
                    )
                archive.writestr(
                    "backup-manifest.json",
                    json.dumps(manifest, indent=2, sort_keys=True),
                )
            os.replace(temporary_archive, archive_path)
        finally:
            temporary_archive.unlink(missing_ok=True)

    removed_count = prune_expired_archives(backup_dir, retention_days)
    if not args.quiet:
        print(f"Verified local backup created: {archive_path}")
        if removed_count:
            print(f"Removed {removed_count} backup archive(s) older than {retention_days:g} days.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Backup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
