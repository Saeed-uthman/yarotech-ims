# Local operation, deployment, and backups

This project supports two deliberately separate environments:

- **Current local/development mode:** Windows, SQLite, Django `runserver`, and
  the Vite development server.
- **Production deployment:** PostgreSQL, a production WSGI server, HTTPS, a
  reverse proxy, and scheduled off-computer backups.

Do not use the local `.env` file as the production environment file.

## Double-click local startup

After the one-time backend and frontend setup is complete, double-click:

`Start Pharmacy System.cmd`

The launcher:

1. Checks that the Python virtual environment, Node.js, and frontend packages
   are present.
2. Creates a verified SQLite and media backup when the latest automatic backup
   is more than 12 hours old.
3. Starts the Django API and Vite frontend in separate minimized windows.
4. Waits for both health checks and opens `http://localhost:3000`.

Close the two server windows named **Al-Amaan Pharmacy API** and **Al-Amaan
Pharmacy Frontend** when the system should stop. Do not run two copies of the
launcher on different Windows accounts against the same SQLite file.

This launcher is appropriate while the system is still being developed and
validated. Django `runserver` and Vite are not the final production runtime.

## Local SQLite decision

SQLite may be retained temporarily when all of the following are true:

- One pharmacy computer is the only host.
- Normally only one operator records transactions at a time.
- The database file is stored on a local disk, not a network share or synced
  live database folder.
- Automatic backups are enabled and restoration is tested.

Move the operational installation to PostgreSQL before multiple tills,
multiple simultaneous users, remote access, or production deployment. The
sales and stock workflows use row locking; SQLite ignores
`select_for_update()`, while PostgreSQL provides the intended protection.

## Local backup behavior

Double-click `Backup Pharmacy Data.cmd` for an immediate backup.

The launcher detects `DB_ENGINE`. SQLite archives contain a consistent SQLite
snapshot; PostgreSQL archives contain a custom-format `pg_dump`. Both include:

- A transactionally consistent database snapshot.
- The uploaded media directory, including the pharmacy logo.
- A manifest containing the database SHA-256 and integrity-check result.

PostgreSQL requires `pg_dump` and `pg_restore`. Add PostgreSQL's `bin` directory
to `PATH`, or configure `POSTGRES_BIN` in `.env`. The password is supplied via
the child process environment and is not placed in the command line.

To verify an existing archive without changing live data, drag its ZIP file
onto `Verify Pharmacy Backup.cmd`. Verification checks ZIP integrity, the
database checksum, media count, and (for PostgreSQL) the dump catalogue.

### PostgreSQL restore rehearsal

Create a separate empty test database, then run `Rehearse PostgreSQL
Restore.cmd`. The tool refuses the live `DB_NAME`, requires the rehearsal name
twice, restores with `pg_restore`, validates the Django migration table, and
extracts media under `backups/restore-rehearsals/`. It never overwrites live
media. Review record counts and financial totals before manually removing the
rehearsal database.

Run `scripts/compare_postgres_restore.py <rehearsal_database>` with the backend
virtual-environment Python to compare critical counts, stock units, debts,
sales and purchase totals, ledger inflows/outflows, and document sequences.
The comparison is read-only and refuses the live database as its target.

The default policy keeps backups for 30 days and creates at most one automatic
startup backup every 12 hours. Configure these values in `.env`:

```dotenv
PHARMACY_BACKUP_DIR=backups
PHARMACY_BACKUP_RETENTION_DAYS=30
PHARMACY_BACKUP_MIN_INTERVAL_HOURS=12
```

For protection even on days when the application is not opened, run `Install
Daily Backup Schedule.cmd` once. It creates a current-user Windows task at
8:00 PM using the non-interactive backup runner. The minimum interval still
prevents redundant archives. It is configured to run on battery power, but it
runs only while the current Windows user is logged on so no Windows password
has to be stored. Confirm the task's Last Run Result periodically.

For real operations, set `PHARMACY_BACKUP_DIR` to a second disk or encrypted
synced folder. A backup stored only on the same computer does not protect
against disk failure, theft, fire, or ransomware. Keep another encrypted copy
off the premises and test a restore on a separate copy of the application.

### SQLite restore outline

Restoration replaces live business data, so it is intentionally not automated.

1. Close both application server windows.
2. Preserve the current `alamaan_backend/db.sqlite3` and
   `alamaan_backend/media/` before replacing anything.
3. Extract a selected backup archive.
4. Replace `alamaan_backend/db.sqlite3` with `database/db.sqlite3` from the
   archive and restore the `media/` contents.
5. Start the system and verify users, products, stock, sales, purchases,
   customer debts, settings, and reports.

Perform the first restore rehearsal before the owner begins entering live data.

## PostgreSQL for local operational use

PostgreSQL can run on the same Windows computer as the application. This keeps
the owner experience local while enabling the transaction and row-locking
behavior required by the application.

The migration phase should be performed in this order:

1. Take and verify a final SQLite backup.
2. Install PostgreSQL and create a dedicated database and non-superuser role.
3. Export application data from SQLite.
4. Set `DB_ENGINE=postgresql` and the `DB_*` variables in the private `.env`.
5. Apply migrations to the empty PostgreSQL database.
6. Import the application data and reset sequences.
7. Run the full test suite and confirm that all three concurrency tests pass
   rather than skip.
8. Reconcile stock, ledger balances, debts, and document sequences before
   accepting new transactions.

Do not switch databases simply by changing `DB_ENGINE`; the existing SQLite
records must be deliberately migrated and reconciled.

## Production deployment path

Before selecting a host, run `scripts/check_production_security.py` with the
backend virtual-environment Python. It exercises Django's deployment checks
with temporary secure values and leaves the local configuration unchanged.

The existing production foundation is under `deploy/` and
`alamaan_backend/DEPLOYMENT.md`. The remaining host-specific work is:

1. Build the React frontend and serve `dist/` through the chosen static host or
   Nginx.
2. Run Django with Gunicorn behind Nginx on a Linux host.
3. Use PostgreSQL on a private network or managed database service.
4. Set `DJANGO_DEBUG=False`, unique secrets, exact allowed hosts/origins, HTTPS,
   secure cookies, HSTS, and trusted-proxy settings.
5. Run migrations, collect static assets, and complete Django's deployment
   checks and the PostgreSQL concurrency gate.
6. Schedule `pg_dump` custom-format backups plus media backups, encrypt and copy
   them off-site, monitor failures, and rehearse `pg_restore` regularly.

The final scripts and configuration depend on the selected deployment target
(for example, a Linux VPS versus a managed platform). Choose the target before
making the production launcher or CI/CD workflow.
