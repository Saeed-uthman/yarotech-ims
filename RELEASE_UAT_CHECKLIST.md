# Release user-acceptance checklist

Complete this checklist on the intended operational computer after the automated release-readiness gate passes. Use clearly identified test records and remove or cancel them before accepting live transactions.

## Environment and recovery

- [ ] `Run Release Readiness Check.cmd` finishes with **READY FOR MANUAL UAT**.
- [ ] `Start Pharmacy System.cmd` creates or verifies a backup, starts both services, and opens the browser.
- [ ] The latest backup ZIP passes `Verify Pharmacy Backup.cmd`.
- [ ] The scheduled backup task has a recent `Last Result` of `0`.
- [ ] A restore rehearsal has been completed and critical totals reconcile.
- [ ] The owner knows where the off-computer encrypted backup copy is stored.

## Access and security

- [ ] An administrator can sign in and sign out.
- [ ] A cashier can use sales but cannot access staff, settings, purchases, accountability, or administrative reports.
- [ ] Pending and suspended users cannot sign in.
- [ ] Password change works and invalidates the expected session credentials.
- [ ] Inactivity logout occurs after the configured timeout.
- [ ] Audit events show the correct staff member, action, outcome, time, and request ID without passwords or tokens.

## Products, purchasing, and inventory

- [ ] Product search matches partial text in the sales and stock-purchase forms.
- [ ] Product company/manufacturer changes save and remain after refresh.
- [ ] A stock purchase increases the correct product variant and batch quantity.
- [ ] Purchase cancellation/return adjusts stock and accountability exactly once.
- [ ] Low-stock, out-of-stock, batch, and expiry indicators show the expected records.
- [ ] Inventory value agrees with a manual sample calculation.

## Sales, receipts, and customer debt

- [ ] A fully paid walk-in sale reduces stock and records money received.
- [ ] A partial credit sale records only the amount collected and creates the correct customer debt.
- [ ] Debt recovery reduces outstanding debt and increases cash generated without recounting the sale.
- [ ] Duplicate submission does not create a second sale or stock deduction.
- [ ] Sale cancellation/return restores the correct stock and financial entries.
- [ ] Printed receipt shows pharmacy details, every purchased item, totals, payment status, footer, and barcode/QR code.

## Finance, settings, and presentation

- [ ] Net Cash Generated equals sales collected plus debt recovered minus stock purchases and operating expenses for a manual sample.
- [ ] Today, week, month, last month, and custom date filters produce the expected figures.
- [ ] Cancelled transactions do not affect active financial totals.
- [ ] Pharmacy identity and receipt settings save and remain after restart.
- [ ] Light and dark themes apply consistently, and all inputs remain readable.
- [ ] Dashboard, accountability, reports, and stock totals agree for the test workflow.

## Sign-off

| Item | Value |
|---|---|
| Application version/commit | |
| Database engine | |
| Test computer/environment | |
| Automated gate date | |
| Backup archive verified | |
| UAT completed by | |
| UAT completion date | |
| Known accepted limitations | |
| Approved for live use by | |

Do not approve live use while any critical workflow, backup, restore, permission, financial reconciliation, or receipt check is incomplete.
