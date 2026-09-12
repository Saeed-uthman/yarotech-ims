New Sale searches the customer database after a 250 ms pause and reads every
matching result page before enabling creation. Names are compared after trimming
and ignoring case. Existing names require an explicit selection; inactive matches
must be reactivated by an administrator. Names remain nonunique in the database.
Separate cashiers can still create the same name concurrently: the final search is
a recheck, not a database uniqueness constraint.

The saved customer is independent of the sale and remains saved if the sale is
cancelled. Editing the search clears the selected customer. Walk-in sales and
payment rules retain their existing behavior.

Phone may be omitted, blank, or null on creation; missing values are stored as
NULL. Omitting phone on an update preserves its existing value. Explicit blank or
null clears it. Supplied numbers retain their database uniqueness constraint.
Frontend display models map missing phone values to an empty string.

Run these commands in **Windows CMD** before using name-only creation:

```bat
cd /d "D:\software development\yarotech-pos\alamaan_backend"
venv\Scripts\python.exe manage.py migrate customers --plan
venv\Scripts\python.exe manage.py migrate customers
venv\Scripts\python.exe manage.py showmigrations customers
```

Expected result: `[X] 0004_customer_optional_phone`. The migration is prepared but
has not been applied to the application database by this change. Stop the local
application while applying it and restart with the updated backend and frontend.
Use the existing database backup procedure before applying it to a deployed system.

The migration removes phone's NOT NULL requirement, retains uniqueness, and
converts historical empty or space-only phones to NULL. The configured local
SQLite engine rebuilds the customer table for this alteration. Production engine,
table size, lock duration, and deployment behavior have not been verified. Deploy
the migration before allowing the new code to create name-only customers.

The data step is deliberately irreversible: missing numbers cannot be reconstructed
to restore the old NOT NULL column safely. Roll forward after name-only customers
exist; a schema rollback requires a separate data-repair or restore plan.

Repeat validation in Windows CMD:

```bat
cd /d "D:\software development\yarotech-pos"
npm run lint
npm run build
npm run test:customer-search
cd alamaan_backend
venv\Scripts\python.exe manage.py test apps.customers apps.sales --noinput
venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Browser checks require Node 22+ and installed Chrome, Chromium, or Edge. Set
`CHROME_PATH` to the browser executable if automatic discovery does not find it.
They run headlessly with a temporary profile and simulated API responses; the
actual React controls and API adapters run, but no application data is changed.
Backend tests use Django's disposable test database with the configured engine.
