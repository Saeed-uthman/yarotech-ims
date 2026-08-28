# Release acceptance checklist

This checklist closes the SQLite integration phase. PostgreSQL remains the
production target, and its row-locking concurrency gate is intentionally
deferred until the database switch.

## 1. Start the local system

Run the Django commands yourself from a PowerShell terminal:

```powershell
cd "D:\software development\pharmacy-ims\alamaan_backend"
.\env\Scripts\Activate.ps1
python manage.py migrate
python manage.py check
python manage.py runserver
```

In a second terminal, start the frontend:

```powershell
cd "D:\software development\pharmacy-ims"
npm run dev
```

Confirm both URLs respond:

- Frontend: `http://localhost:3000`
- Django database health: `http://127.0.0.1:8000/health/`

If no administrator exists, stop the Django server temporarily and run
`python manage.py createsuperuser`, then start it again. Do not use shared or
hardcoded credentials.

## 2. Authentication and access control

- [ ] An active administrator can sign in and `/auth/me/` restores the session after a page refresh.
- [ ] A new staff registration is created as pending and cannot sign in before approval.
- [ ] The administrator can approve the pending account as a cashier.
- [ ] The approved cashier can sign in and change their password.
- [ ] Logout returns to sign-in and the submitted refresh token cannot be reused.
- [ ] A cashier cannot open users, settings, reports, accountability, purchase creation, product maintenance, or inventory adjustment actions.
- [ ] Password recovery displays the administrator-contact process and does not claim to submit an unavailable reset request.

## 3. Catalog, purchase, and inventory

- [ ] An administrator can create a category, company, product, and company-specific product variant.
- [ ] Barcode lookup finds the registered product using either a USB scanner or manual entry.
- [ ] A stock purchase increases the selected variant's available stock by the recorded quantity.
- [ ] Purchase history and the accountability ledger show the same purchase reference and amount.
- [ ] A manual stock adjustment records its reason and produces the expected movement entry.
- [ ] Low-stock counts agree across the header alert, inventory module, and low-stock alert center.

## 4. Sales, debt, and rollback behavior

- [ ] A cash sale creates one invoice, reduces stock once, and records the cash posting once.
- [ ] Repeating a submission with the same idempotency key does not create a second sale.
- [ ] A credit sale increases the customer's outstanding balance by the unpaid amount.
- [ ] A debt payment reduces the customer balance and posts the matching recovery transaction.
- [ ] Cancelling an eligible sale restores stock, reverses its financial effect, and preserves an audit trail.
- [ ] A sale that exceeds available stock is rejected without changing stock, customer debt, or the ledger.

## 5. Settings, reporting, and operational status

- [ ] Updating pharmacy, receipt, tax, currency, sales, and inventory settings persists after refresh.
- [ ] Dashboard, reports, sales, purchases, customers, inventory, and accountability totals agree for the acceptance transactions.
- [ ] Receipt output uses the configured pharmacy identity and receipt options.
- [ ] The network panel reports the Django API as reachable while `/health/` is healthy.
- [ ] Stopping Django changes the header/network status to unavailable within 30 seconds; restarting Django restores it.
- [ ] No demo credentials, sample notifications, mock repository data, or fake successful actions appear in the running UI.

## 6. Automated SQLite gate

The current accepted result is **101 passed and 3 skipped**. The skipped tests
require database row locking, which SQLite does not provide. Before declaring a
new SQLite release candidate, run these Django commands yourself:

```powershell
cd "D:\software development\pharmacy-ims\alamaan_backend"
.\env\Scripts\Activate.ps1
python manage.py makemigrations --check --dry-run
python manage.py check
python manage.py test
python -m pytest -q -p no:cacheprovider
python manage.py spectacular --file schema.yml --validate
```

The frontend gate is:

```powershell
cd "D:\software development\pharmacy-ims"
npm run lint
npm run build
```

## 7. Deferred PostgreSQL gate

When PostgreSQL is enabled, follow `alamaan_backend/DEPLOYMENT.md` and run:

```powershell
python manage.py test apps.common.tests.ConcurrentTransactionTests -v 2
```

All three concurrency tests must pass with no skips before production release.
Record the final database backup and restore rehearsal separately.

## Acceptance record

| Item | Value |
|---|---|
| Release candidate | |
| Date | |
| Tester | |
| Browser/device | |
| Automated gate | |
| Manual checklist | Pass / Fail |
| Blocking notes | |
