# Product recognition on your own VPS

The cashier opens **Find by photo**, starts the camera, photographs one item, selects a suggested product, chooses its variant, and enters the quantity. Restocking uses the same flow. Nothing is added automatically. Barcode and text search remain available.

Upload an actual JPEG, PNG or WebP in the product editor. The existing image field now persists the upload. One current photo per parent product is indexed; variants share that photo. Sample photos have been removed from the editor. A clear view of the product or its packaging works better than an unrelated stock image. Tiny RJ45 connectors and near-identical router models may be indistinguishable: the cashier must confirm the suggestion. Accuracy on your real catalogue has not yet been measured.

## What runs where

- The browser sends one photo to your existing authenticated API domain.
- A separate CPU worker on your VPS computes a 512-value image embedding and compares it against your catalogue photo index. It returns at most five candidates; similarity is not a confidence percentage.
- No hosted AI API, subscription, or API key is used. The initial model download contacts Hugging Face; runtime matching and indexing do not download anything or upload images to another service.
- Search photos are not persisted by the application. Proxy/framework upload buffering can use temporary files; this is not a permanent photo archive.
- Product photos remain in existing media storage. The index is a replaceable local artifact. No database migration is needed.
- Catalogue refreshes reuse unchanged embeddings and atomically replace the index. A failed refresh keeps the previous index. Deleted, inactive, and replaced-photo products are excluded from results immediately. New photos appear after the next successful refresh.

## Limits

Images must be at most 4 MiB, 12 megapixels, at least 32 pixels on each side, and aspect ratio at most 8:1. Animated files and URLs are rejected. Stored uploads are normalized to JPEG, max 1600 pixels, with metadata removed. Only local files within MEDIA_ROOT are indexed; remote image URLs are skipped.

The worker handles one model inference at a time and returns 503 when busy. Per-user request throttling defaults to 20/min. The index defaults to 10,000 products and a minimum cosine similarity of 0.65. Tune the threshold using real positive and negative examples; do not interpret 0.65 as 65% confidence.

## Existing VPS update

These are templates for your existing installation, not a replacement of its Nginx configuration. Do not enable them unchanged: first resolve the service user, environment and available memory. No live services have been changed by this feature work.

Run these read-only commands first. Do not share secret environment values:

```bash
systemctl show yarotech-ims-api -p User -p Group -p WorkingDirectory -p EnvironmentFiles
ss -ltn '( sport = :8025 )'
free -h
df -h /var/www/yarotech-ims
/var/www/yarotech-ims/.venv/bin/python --version
```

Port 8025 must be free. Python 3.12 or newer is required by the optional dependency set. The worker and refresh service each have a 1 GiB memory ceiling and can overlap; these are ceilings, not measured VPS consumption. Allow headroom for existing mail, RADIUS, database and web services. CPU limits are one core for queries and half a core for indexing. Measure actual latency and memory before enabling for all cashiers.

1. Back up the existing frontend dist directory and API Nginx configuration. Deploy this revision using the existing update process. Preserve local package-lock changes and untracked backup directories; do not reset the production checkout.
2. Keep the main API virtual environment unchanged. Create an isolated photo environment using the same installed backend versions:

```bash
cd /var/www/yarotech-ims
.venv/bin/python -m pip freeze > /tmp/yarotech-photo-base-requirements.txt
python3 -m venv .venv-photo
.venv-photo/bin/python -m pip install -r /tmp/yarotech-photo-base-requirements.txt
.venv-photo/bin/python -m pip install -r alamaan_backend/requirements/visual-search.txt
.venv-photo/bin/python -m pip check
```

Use the same Python minor version as the current API when creating the environment. If `python3` differs, substitute the verified interpreter. Review any local/editable paths in the frozen requirements before installation.

3. Prepare `/etc/yarotech-pos/photo-search.env` with the same Django secret, PostgreSQL connection, allowed hosts, CORS, logging and other required settings as the existing API. Do not generate a new secret or switch databases. The application also reads existing repository/backend .env files. Add the following only to the photo worker's environment, not the main API:

```dotenv
VISUAL_SEARCH_ENABLED=True
VISUAL_SEARCH_DIR=/var/www/yarotech-ims/alamaan_backend/var/visual-search
VISUAL_SEARCH_THREADS=1
VISUAL_SEARCH_MAX_PRODUCTS=10000
VISUAL_SEARCH_MIN_SIMILARITY=0.65
PRODUCT_PHOTO_SEARCH_RATE=20/min
```

Protect the environment file with mode 0600 (systemd reads it as root). Prepare the index and log directories for the existing API service user/group. Give that user read access to catalogue media. Do not recursively change ownership of the existing app or media. If logging is configured elsewhere, adjust the templates' ReadWritePaths accordingly.

4. Copy the three `deploy/systemd/yarotech-photo-*.example` files to `/etc/systemd/system/`, dropping `.example`. Replace both user/group placeholders with a non-root service account that can read the existing configuration/media and connect to the database. If the existing API runs as root, provision a dedicated account and its permissions rather than running this worker as root.
5. Download the model and build the first index under the same service account and environment. A transient systemd service preserves EnvironmentFile syntax without shell-sourcing secrets. Replace USER/GROUP with the account configured above:

```bash
systemd-run --wait --pipe --collect --unit=yarotech-photo-model-setup \
  --property=User=USER --property=Group=GROUP \
  --property=WorkingDirectory=/var/www/yarotech-ims/alamaan_backend \
  --property=EnvironmentFile=/etc/yarotech-pos/photo-search.env \
  /var/www/yarotech-ims/.venv-photo/bin/python manage.py download_visual_model
systemctl daemon-reload
systemctl start yarotech-photo-index.service
journalctl -u yarotech-photo-index.service -n 40 --no-pager
systemctl enable --now yarotech-photo-search.service yarotech-photo-index.timer
systemctl status yarotech-photo-search.service yarotech-photo-index.timer --no-pager
```

The model is about 89 MB; its pinned SHA-256 is checked on download and first load. The index command reports indexed count and skipped product IDs. Investigate skipped actual product photos. Re-run the index after uploading initial photos.

6. Add `deploy/nginx/yarotech-photo-search.location.example` inside the existing HTTPS API server. Ensure the existing product create/update route also permits a 5 MiB request body, so its 4 MiB photo plus multipart fields can pass. Keep existing routes, TLS, CORS and security headers. The frontend already requires `Permissions-Policy: camera=(self)`, HTTPS, and CSP connect-src allowing your API domain.
7. Build the frontend with the existing production VITE_API_BASE_URL, and deploy it with the current process. Restart only `yarotech-ims-api` for the updated upload serializer and routing; test Nginx with `nginx -t` before `systemctl reload nginx`. Do not restart unrelated services.

## Verify before using it for real sales

- `curl -i -X POST https://api-shop.yarotech.com.ng/api/v1/products/photo-search/` should return 401 when unauthenticated. This checks routing/authentication, not model readiness.
- Upload and reopen a real product photo; verify it persists and its media URL loads.
- Refresh the index and verify its count. From an authenticated cashier browser, photograph a known product, confirm its variant and quantity, and inspect the draft sale. Do not submit a real sale solely as a deployment test.
- Try a different angle, a similar model and an unrelated object. Verify suggestions are useful and incorrect suggestions can be rejected.
- Verify a restock draft, camera permission denial, closing the modal and manual search.
- Watch `journalctl -u yarotech-photo-search.service -f` and `systemctl show yarotech-photo-search -p MemoryCurrent -p CPUUsageNSec`. Check your other services while indexing.
- Use `systemctl start yarotech-photo-index.service` for an immediate refresh. The timer otherwise runs about two minutes after the last refresh completes.

No physical phone-camera or real-catalogue accuracy result is established by mocked browser tests. The local real-model smoke test checks dimensions, normalized output, repeatability and that socket connections are blocked during inference.

## Rollback

Remove the exact photo-search Nginx location and validate/reload Nginx, then disable/stop the photo worker and timer. Wait for or stop an ongoing index service. Restore the previous frontend build if you want to hide the photo button; otherwise the new API returns an explicit unavailable response. Keep the main API available for normal product search, barcode scanning and sales. Saved product photos need not be deleted. The model/index directory is derived data, but keep it until rollback is verified.

## Local validation commands

Known pre-existing check failure: `makemigrations --check --dry-run` proposes an alteration to `Product.dosage_form` because migration 0002 includes legacy medicine choices absent from the current model. Photo search does not change that model or create/apply migrations. Resolve this existing mismatch separately before treating the repository's full migration gate as clean.

```powershell
npm.cmd run lint
npm.cmd run build
node scripts/test_photo_search.mjs
node scripts/test_barcode_scanning.mjs
node scripts/test_customer_search.mjs
$env:DB_ENGINE='sqlite'
$env:SQLITE_PATH=':memory:'
$env:LEGACY_DB_NAME=''
$env:DJANGO_DEBUG='True'
$env:DJANGO_SECURE_SSL_REDIRECT='False'
Push-Location alamaan_backend
.\venv\Scripts\python.exe manage.py test apps.products.test_visual_search --noinput
Pop-Location
.\alamaan_backend\venv\Scripts\python.exe scripts/check_visual_model.py
```

Tests use a temporary test database/media/index; the smoke test requires the explicitly downloaded model. Runtime dependencies are optional and listed in `alamaan_backend/requirements/visual-search.txt`.

Model and preprocessing provenance: [pinned ONNX model](https://huggingface.co/Xenova/clip-vit-base-patch32/blob/6ef1ebc8b0766a7a8d11b146462c99cdf74dd22d/onnx/vision_model_quantized.onnx), [CLIP preprocessing configuration](https://huggingface.co/Xenova/clip-vit-base-patch32/blob/6ef1ebc8b0766a7a8d11b146462c99cdf74dd22d/preprocessor_config.json), [ONNX Runtime CPU thread controls](https://onnxruntime.ai/docs/performance/tune-performance/threading.html).
