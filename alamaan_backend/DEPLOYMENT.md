# Django API deployment

Local development intentionally uses SQLite. PostgreSQL is the production
database and is also required for the final row-locking concurrency gate.

## Local SQLite

Copy the repository `.env.example` to `.env` and leave `DB_ENGINE=sqlite`.
The existing `db.sqlite3` remains the default when no `.env` file exists.

## PostgreSQL production environment

Use a private environment file and set at least:

```dotenv
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<a unique high-entropy secret>
DJANGO_ALLOWED_HOSTS=api.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
CSRF_TRUSTED_ORIGINS=https://app.example.com
DB_ENGINE=postgresql
DB_NAME=alamaan_pharmacy
DB_USER=alamaan_user
DB_PASSWORD=<database password>
DB_HOST=127.0.0.1
DB_PORT=5432
DB_SSLMODE=require
DJANGO_TRUST_PROXY_HEADERS=True
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=True
```

Only enable `DJANGO_TRUST_PROXY_HEADERS` when the application accepts traffic
solely from a trusted proxy that overwrites `X-Forwarded-Proto`.

Install `requirements/production.txt`, then run the Django deployment gate:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py check --deploy
python manage.py spectacular --file schema.yml --validate
python manage.py test
python -m pytest -q -p no:cacheprovider
```

Run the real row-locking tests against PostgreSQL before deployment. The
database user used for this test must be permitted to create the Django test
database:

```bash
python manage.py test apps.common.tests.ConcurrentTransactionTests -v 2
```

All three tests must run and pass; none should be skipped.

## Application and reverse proxy

`gunicorn.conf.py` supplies conservative production defaults. Copy and adapt
the templates in `deploy/systemd/` and `deploy/nginx/`, replace the example
domain and filesystem paths, then validate the NGINX configuration before
reload. The public `/health/` endpoint performs a minimal database readiness
check and exposes no application data.

## Recurring operations

- Run `python manage.py flushexpiredtokens` daily.
- Back up PostgreSQL daily with `pg_dump` and store encrypted copies off-site.
- Back up the media directory with the same retention policy.
- Test restoration regularly; an untested backup is not a recovery plan.
- Configure `SENTRY_DSN` only after the Sentry project and privacy policy are
  approved. Default PII collection is disabled by the application settings.
