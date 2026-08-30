"""Restore a PostgreSQL backup into an explicitly named non-live rehearsal database."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for raw in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("\"'")
    return values


def tool(name: str, environment: dict[str, str]) -> str:
    configured = environment.get("POSTGRES_BIN", "").strip()
    candidate = Path(configured) / f"{name}.exe" if configured else None
    found = str(candidate) if candidate and candidate.is_file() else (shutil.which(name) or shutil.which(f"{name}.exe"))
    if not found:
        raise FileNotFoundError(f"{name} was not found. Configure POSTGRES_BIN in .env.")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("target_database")
    parser.add_argument("--confirm", required=True, help="Must exactly match target_database")
    args = parser.parse_args()

    archive_path = Path(str(args.archive).strip()).expanduser().resolve()
    target_database = args.target_database.strip()
    confirmation = args.confirm.strip()

    root = Path(__file__).resolve().parents[1]
    environment = read_env(root / ".env")
    for key, value in read_env(root / "alamaan_backend" / ".env").items():
        environment.setdefault(key, value)
    live_database = environment.get("DB_NAME", "")
    if not target_database or target_database == live_database:
        raise ValueError("The rehearsal target must be a separate, non-live database.")
    if confirmation != target_database:
        raise ValueError("Confirmation does not exactly match the rehearsal database name.")
    if not archive_path.is_file():
        raise FileNotFoundError(f"Backup archive not found: {archive_path}")

    pg_restore = tool("pg_restore", environment)
    psql = tool("psql", environment)
    process_env = os.environ.copy()
    process_env["PGPASSWORD"] = environment.get("DB_PASSWORD", "")
    connection = ["--host", environment.get("DB_HOST", "127.0.0.1"), "--port", environment.get("DB_PORT", "5432"), "--username", environment.get("DB_USER", "")]

    with tempfile.TemporaryDirectory(prefix="alamaan-restore-rehearsal-") as temp:
        with zipfile.ZipFile(archive_path) as archive:
            manifest = json.loads(archive.read("backup-manifest.json"))
            if manifest.get("database_engine") != "postgresql":
                raise ValueError("This rehearsal command accepts PostgreSQL backups only.")
            database_member = manifest["database_file"]
            if database_member not in archive.namelist():
                raise RuntimeError("Manifest database member is missing from the archive.")
            dump_path = Path(temp) / "database.dump"
            with archive.open(database_member) as source, dump_path.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            media_destination = root / "backups" / "restore-rehearsals" / f"{target_database}-{datetime.now():%Y%m%d-%H%M%S}"
            for member in archive.namelist():
                if member.startswith("media/") and not member.endswith("/"):
                    relative = Path(member).relative_to("media")
                    if relative.is_absolute() or ".." in relative.parts:
                        raise RuntimeError(f"Unsafe media archive path: {member}")
                    destination = media_destination / "media" / relative
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(member) as source, destination.open("wb") as target:
                        shutil.copyfileobj(source, target)

        subprocess.run([pg_restore, *connection, "--dbname", target_database, "--clean", "--if-exists", "--no-owner", "--no-acl", str(dump_path)], env=process_env, check=True)
        result = subprocess.run([psql, *connection, "--dbname", target_database, "--tuples-only", "--command", "SELECT COUNT(*) FROM django_migrations;"], env=process_env, check=True, capture_output=True, text=True)
        if not result.stdout.strip():
            raise RuntimeError("Restored database validation query returned no result.")

    print(f"Restore rehearsal completed in database: {target_database}")
    print(f"Rehearsal media extracted under: {media_destination}")
    print("Review business totals, then remove the rehearsal database manually when finished.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Restore rehearsal failed: {error}", file=sys.stderr)
        raise SystemExit(1)
