"""Run the repeatable, non-mutating release-readiness gate."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def run_step(name: str, command: list[str], *, cwd: Path) -> bool:
    print(f"\n{'=' * 72}\n{name}\n{'=' * 72}", flush=True)
    result = subprocess.run(command, cwd=cwd)
    if result.returncode:
        print(f"FAILED: {name} (exit code {result.returncode})", flush=True)
        return False
    print(f"PASSED: {name}", flush=True)
    return True


def newest_backup(root: Path) -> Path | None:
    backup_dir = root / 'backups'
    candidates = list(backup_dir.glob('alamaan-*-backup-*.zip'))
    return max(candidates, key=lambda item: item.stat().st_mtime) if candidates else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skip-tests', action='store_true', help='Skip the complete Django test suite.')
    parser.add_argument('--skip-frontend', action='store_true', help='Skip TypeScript and production build checks.')
    parser.add_argument('--skip-backup', action='store_true', help='Skip verification of the newest backup archive.')
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    backend = root / 'alamaan_backend'
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'
    failures: list[str] = []

    with tempfile.TemporaryDirectory(prefix='alamaan-release-') as temporary_dir:
        schema_path = Path(temporary_dir) / 'schema.yml'
        steps: list[tuple[str, list[str], Path]] = [
            ('Django system check', [sys.executable, 'manage.py', 'check'], backend),
            (
                'Migration drift check',
                [sys.executable, 'manage.py', 'makemigrations', '--check', '--dry-run'],
                backend,
            ),
            (
                'OpenAPI schema validation',
                [sys.executable, 'manage.py', 'spectacular', '--file', str(schema_path), '--validate'],
                backend,
            ),
            (
                'Production security gate',
                [sys.executable, str(root / 'scripts' / 'check_production_security.py')],
                root,
            ),
        ]
        if not args.skip_tests:
            steps.append(('Complete Django test suite', [sys.executable, 'manage.py', 'test'], backend))
        if not args.skip_frontend:
            steps.extend([
                ('Frontend TypeScript check', [npm, 'run', 'lint'], root),
                ('Frontend production build', [npm, 'run', 'build'], root),
            ])

        for name, command, cwd in steps:
            if not run_step(name, command, cwd=cwd):
                failures.append(name)

    if not args.skip_backup:
        backup = newest_backup(root)
        if backup is None:
            failures.append('Newest backup verification')
            print('\nFAILED: No backup archive was found under backups/.', flush=True)
        elif not run_step(
            f'Newest backup verification ({backup.name})',
            [sys.executable, str(root / 'scripts' / 'verify_backup.py'), str(backup)],
            cwd=root,
        ):
            failures.append('Newest backup verification')

    print(f"\n{'=' * 72}\nRELEASE READINESS RESULT\n{'=' * 72}")
    if failures:
        print('NOT READY. Failed checks:')
        for failure in failures:
            print(f'  - {failure}')
        return 1

    print('READY FOR MANUAL UAT. All automated release checks passed.')
    print('Complete RELEASE_UAT_CHECKLIST.md before accepting live transactions.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
