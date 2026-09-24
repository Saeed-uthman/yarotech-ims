# Barcode scanning for sales and restocking

Products use their saved **product barcode**. Serial-number tracking is not part
of this workflow. Set the barcode in the product create/edit form before scanning
it. A device's unique serial barcode will not identify every unit of its model.
If you generate a product barcode, attach a matching printed label to the product
or its packaging. Keep product barcodes unambiguous within the catalogue.

## Using the scanner

1. Open **New Sale** or **Record Stock Purchase (Restock)** and click the camera
   button beside product search.
2. Allow camera access and point the camera at the saved product barcode.
3. Scanning pauses after one successful read. Confirm the product and choose a
   manufacturer/variant if the product has more than one active variant.
4. Enter a positive whole quantity, then choose **Add to sale** or **Add to restock**.
5. Review the order, prices and payment details, then complete the normal form.

Scanning and adding only change the order draft. Inventory changes when the sale
or purchase is successfully saved. Scanning a product again and confirming a
quantity increases its existing order line by that quantity.

Sale quantities cannot exceed the stock shown by the lookup, less the quantity
already in the cart. The backend still checks current stock at checkout. Restock
quantities may exceed existing stock, including when current stock is zero. A
missing purchase price must be entered before saving the order.

The catalogue's general barcode scanner continues to offer **View product**.
An unknown barcode or failed lookup does not add an item. Close the scanner to
use the existing product search instead. Closing it also discards pending lookup
results, so they cannot change a later order.

## Camera access and verification

Use HTTPS on a phone, or localhost when developing on the same computer. Allow
camera permission in the browser. Retry after correcting a denied permission or
unavailable camera. Camera frames are decoded in the browser; the product lookup
sends the decoded barcode to the existing API.

Automated checks use simulated camera reads and API responses with the real React
forms and API adapters. They do not prove recognition on a physical camera or
exercise a live database.

```powershell
npm.cmd run test:barcode
npm.cmd run test:customer-search
npm.cmd run lint
npm.cmd run build
```

Optional styled desktop/mobile checks, after building:

```powershell
$env:BARCODE_VISUAL_CSS = (Get-ChildItem -LiteralPath dist/assets -Filter '*.css' | Select-Object -First 1).FullName
npm.cmd run test:barcode
```

These checks save screenshots to `.tmp/barcode-desktop.png` and
`.tmp/barcode-mobile.png`. Set `CHROME_PATH` if the local Chrome/Edge executable
is not in a standard location.

## Release evidence

Scope: the scanner, quantity selection, and existing sale/purchase draft adapters.
No backend contracts, database schema, migrations, or live records were changed.
Implementation is locally validated; production verdict is **NOT READY** until
the environment-specific checks below are completed. This does not assess the
rest of the POS as a new release.

| Gate | Status | Evidence or remaining check |
|---|---|---|
| Correctness | PASS | Barcode browser tests exercise sales, restocking, variant identity, repeated reads and catalogue lookup. |
| Validation | PASS | Scanner rejects invalid quantities and stock overflow; existing backend input serializers enforce positive integers and sale service checks stock. |
| Authentication | NOT VERIFIED | Existing authenticated barcode endpoint is retained; live session behavior was not tested. |
| Authorization | NOT VERIFIED | Existing purchase admin permission is retained; live role checks were not exercised. |
| Transactions | NOT VERIFIED | Existing atomic sale/purchase services are unchanged; real database rollback was not exercised. |
| Concurrency | NOT VERIFIED | Late camera/lookup results are covered; PostgreSQL stock locking is not exercised by browser fixtures. |
| Idempotency | PASS | One read per scan session and one confirmation per dialog; existing save adapters and endpoints remain in use. |
| Database constraints | N/A | Frontend-only change introduces no persisted fields or schema changes. |
| Indexes | N/A | No query or index changes; existing exact barcode lookup is reused. |
| Migration safety | N/A | No migrations or backfills. |
| Error handling | PASS | Unknown barcode, network error, denied camera, inactive product, no active variants and close-during-request paths are tested. |
| Logging | N/A | No new backend operation or logging mechanism; existing API logging is unchanged. |
| Metrics | NOT VERIFIED | Production lookup latency and error rates were not measured. |
| Tests | PASS | Barcode browser checks, 13 checkout/customer/VAT regressions, TypeScript and production build pass locally. |
| Performance | NOT VERIFIED | One lookup per read is tested; real camera decode performance is unmeasured. Build retains a large-chunk warning. |
| Accessibility | NOT VERIFIED | Labels, dialog focus, keyboard trapping and Escape are covered; physical mobile and screen-reader testing remain. |
| Backwards compatibility | PASS | Existing HTTP payloads and catalogue lookup flow are retained and exercised in browser fixtures. |
| Documentation | PASS | This guide covers usage, setup, tests and limitations. |
| Deployment safety | NOT VERIFIED | No deployment performed. Verify HTTPS, camera permission and real labels on the target device before release. |
| Rollback strategy | NOT VERIFIED | A prior frontend artifact can be restored without a schema rollback; artifact restoration has not been rehearsed. |

Before rollout, test actual product labels on the intended phone/browser, verify
the correct product/variant appears, confirm camera shutdown, and perform an
authorized end-to-end sale and restock in a test environment. Promote the built
frontend through the existing release process and retain the prior artifact.
