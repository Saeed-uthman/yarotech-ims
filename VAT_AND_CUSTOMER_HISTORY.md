Customer history now uses complete sale details: product names and quantities,
invoice total, amount paid, and outstanding debt. It fetches every history page,
keeps customer and cashier access filters, rejects outdated profile responses,
and exposes failed loads with a retry action.

To configure VAT:

1. In **Settings / Sales & POS**, enable VAT and enter the percentage (0–100,
   up to two decimal places). Only administrators can change it.
2. In **Products / Add or Edit / Product Information**, enable **Apply VAT to
   this product** for each applicable product. It applies to all its variants.
3. New Sale shows VAT and the total payable. Receipts show the saved VAT rate and
   amount per taxed line, and the invoice VAT total.
4. **Reports / VAT** shows net VAT billed and collected in the selected period,
   a daily breakdown, and VAT awaiting payment across all dates. This report is
   admin-only and uses date filters, covering all products.

Calculation choices used in this implementation:

- VAT is added on top of the selling price, after discounts. A sale-wide discount
  is allocated proportionally across all lines, including products without VAT.
- Decimal half-up rounding is applied per line. Cumulative discount allocation
  retains every kobo. The browser preview follows the same rounding rules.
- The server calculates VAT from product flags and settings. A changed checkout
  total rejects the sale for review instead of silently changing the payment status.
- Partial payments collect VAT proportionally. Debt payments add collection
  movements; reversals undo them. Returns and cancellations adjust billed and
  collected VAT using the original sale snapshots. Their movements retain their
  own dates, so a payment today against an older sale appears in today's report.
- VAT does not add to item profit. Invoice/payment totals include VAT.
- Settings and product VAT flags default to disabled; the rate defaults to 0%.
  Historical sales retain zero VAT. Changing settings never recalculates old sales.

The migrations are prepared, **not applied to the application database**. Stop
the local application, back up the database using the existing backup procedure,
and run in **Windows CMD**:

```bat
cd /d "D:\software development\yarotech-pos\alamaan_backend"
venv\Scripts\python.exe manage.py migrate --plan
venv\Scripts\python.exe manage.py migrate
venv\Scripts\python.exe manage.py showmigrations customers products settings_app sales
```

Restart the backend and frontend after migration. The VAT migrations add product
and settings fields, saved sale/return amounts, and a VAT movement table. They do
not infer VAT on historical transactions. Deploy the schema and compatible code
before enabling VAT. Do not roll back to code that cannot record VAT after VAT
sales begin; it could omit collection/return adjustments. Prefer rolling forward.

Verification commands:

```bat
cd /d "D:\software development\yarotech-pos"
npm run lint
npm run build
npm run test:customer-search
node --import tsx --test tests/vat.test.ts
cd alamaan_backend
venv\Scripts\python.exe manage.py test apps.customers apps.sales apps.products apps.settings_app apps.reports --noinput
venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Browser tests use real React components and API adapters with simulated responses.
Backend tests use the configured SQLite engine's disposable test database. Live
PostgreSQL migration/locking behavior, deployment, and printer hardware have not
been verified. Inspect generated SQL and operational impact on the target database
before production rollout.
