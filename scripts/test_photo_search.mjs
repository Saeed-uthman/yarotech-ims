// Browser regression checks using Chrome's native debugging protocol and Node's
// built-in WebSocket. No driver download or live API/database is required.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';

const chrome = process.env.CHROME_PATH || [
  `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`,
  `${process.env['PROGRAMFILES(X86)']}/Microsoft/Edge/Application/msedge.exe`,
  `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1234/chrome-win64/chrome.exe`,
].find(candidate => existsSync(candidate));
assert.ok(chrome, 'Set CHROME_PATH to a Chrome, Chromium, or Edge executable.');
console.log('Bundling browser fixture...');
const { outputFiles } = await build({ entryPoints: ['tests/barcode.fixture.tsx'], alias: { '@zxing/browser': path.resolve('tests/barcode-camera.stub.ts') }, bundle: true,
  write: false, format: 'iife', define: { 'import.meta.env.VITE_API_BASE_URL': '"http://fixture/api/v1"' } });
console.log('Starting fixture server...');
const visualCss = process.env.BARCODE_VISUAL_CSS ? readFileSync(process.env.BARCODE_VISUAL_CSS, 'utf8') : '';
const server = createServer((request, response) => {
  if (request.url === '/fixture.css') {
    response.setHeader('Content-Type', 'text/css');
    response.end(visualCss);
    return;
  }
  response.setHeader('Content-Type', request.url === '/fixture.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/fixture.js' ? outputFiles[0].text
    : '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
mkdirSync('.tmp', { recursive: true });
const profile = mkdtempSync(path.resolve('.tmp/photo-browser-'));
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
console.log('Launching browser...');
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome did not start within 20 seconds.')), 20000);
    browser.once('error', error => { clearTimeout(timeout); reject(error); });
    browser.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  console.log('Connecting browser...');
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Cannot connect to the local browser. Check sandbox/network restrictions.')), 15000);
    socket.onopen = () => { clearTimeout(timeout); resolve(); };
    socket.onerror = error => { clearTimeout(timeout); reject(error); };
  });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    clearTimeout(handler.timeout);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error))); else handler.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const command = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      .catch(error => { throw new Error(error.message + ': ' + expression); });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const waitFor = async (expression, description = expression) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out: ${description}\n${await evaluate('document.body.textContent')}`);
  };
  const reset = async (rows = [], sale = false) => {
    const mode = typeof sale === 'string' ? sale : sale ? 'sale' : '';
    await command('Page.navigate', { url: `${origin}/${mode ? `?${mode}` : ''}` });
    await waitFor('Boolean(window.fixture && document.querySelector("#root")?.children.length)');
    await evaluate(`fixture.rows = ${JSON.stringify(rows)}`);
  };
  const field = 'document.querySelector("[role=combobox]")';
  const fill = async (text, selector = field) => {
    await evaluate(`${selector}.focus(); ${selector}.select()`);
    await command('Input.insertText', { text });
  };
  const key = async (key, code) => {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
  };
  const click = async expression => {
    const point = await evaluate(`(() => { const element = ${expression}; element.scrollIntoView(); const r = element.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  const check = async (name, action) => { await action(); console.log(`PASS ${name}`); };


  const button = text => `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`;
  const openScanner = async () => {
    await click('document.querySelector("button[title=\\"Scan barcode with camera\\"]")');
    await waitFor('fixture.cameras.length > 0 && !fixture.cameras.at(-1).stopped');
  };
  const scan = async () => {
    await evaluate('fixture.cameras.at(-1).callback({getText: () => "0123456789012"})');
    await waitFor('Boolean(document.querySelector("#barcode-variant")) || document.body.textContent.includes("No product matches") || document.body.textContent.includes("Product lookup failed") || document.body.textContent.includes("inactive")');
  };
  const quantity = 'document.querySelector("#barcode-quantity")';

  const openPhoto = async () => { await click(button('Find by photo')); await waitFor('Boolean(document.querySelector("#photo-search-file"))'); };
  const choose = async (type = 'image/png', size = 128) => {
    await evaluate("(() => { const input = document.querySelector('#photo-search-file'); const data = new DataTransfer(); data.items.add(new File([new Uint8Array(" + size + ")], 'product.png', {type: " + JSON.stringify(type) + "})); input.files = data.files; input.dispatchEvent(new Event('change', {bubbles: true})); })()");
  };
  const selectMatch = async () => {
    await waitFor('document.body.textContent.includes("Possible matches")');
    await click('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Select to confirm"))');
    await waitFor('Boolean(document.querySelector("#barcode-quantity"))');
  };
  const closePhoto = 'document.querySelector("[aria-label=\\"Close photo search\\"]")';
  await check('camera capture stops tracks and requires product and quantity confirmation', async () => {
    await reset([], 'sale'); await openPhoto(); await click(button('Start camera'));
    await waitFor(button('Capture and find') + ' && !' + button('Capture and find') + '.disabled');
    await click(button('Capture and find'));
    await waitFor('fixture.photoUploads.length === 1 && document.body.textContent.includes("Possible matches")');
    assert.equal(await evaluate('fixture.photoUploads[0].type'), 'image/jpeg');
    assert.ok(await evaluate('fixture.photoStreams.every(s => s.getTracks().every(t => t.readyState === "ended"))'));
    assert.equal(await evaluate('fixture.sales.length'), 0);
    assert.equal(await evaluate('Boolean(document.querySelector("#barcode-quantity"))'), false);
    await selectMatch(); await fill('3', quantity); await click(button('Add to sale'));
    await click('document.querySelector("#confirm-complete-sale-btn")');
    await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].items[0].quantity'), 3);
  });
  await check('photo restock accepts chosen quantity beyond current stock', async () => {
    await reset([], 'purchase'); await openPhoto(); await choose(); await selectMatch();
    await fill('100', quantity); await click(button('Add to restock'));
    await click('document.querySelector("#submit-create-purchase-btn")');
    await waitFor('fixture.purchases.length === 1');
    assert.equal(await evaluate('fixture.purchases[0].items[0].quantity'), 100);
  });
  await check('no match, empty catalogue, and service failure allow recovery', async () => {
    await reset([], 'sale'); await evaluate('fixture.photoEmpty = true'); await openPhoto(); await choose();
    await waitFor('document.body.textContent.includes("No close match")');
    await click(button('Try another photo')); await evaluate('fixture.indexedProducts = 0'); await choose();
    await waitFor('document.body.textContent.includes("No searchable catalogue photos")');
    await click(button('Try another photo')); await evaluate('fixture.photoFailStatus = 503'); await choose();
    await waitFor('document.body.textContent.includes("Local photo search is not ready")');
    assert.ok(await evaluate('Boolean(document.querySelector("#photo-search-file"))'));
    await evaluate('fixture.photoFailStatus = 0; fixture.photoEmpty = false; fixture.indexedProducts = 1');
    await choose(); await selectMatch();
  });
  await check('closing a pending photo request ignores late results', async () => {
    await reset([], 'sale'); await evaluate('fixture.holdPhoto = true'); await openPhoto(); await choose();
    await waitFor('Boolean(fixture.releasePhoto)'); await click(closePhoto);
    await evaluate('fixture.releasePhoto()'); await openPhoto();
    assert.ok(await evaluate('Boolean(document.querySelector("#photo-search-file"))'));
    assert.equal(await evaluate('document.body.textContent.includes("Possible matches")'), false);
  });
  await check('closing pending camera permission stops the eventual stream', async () => {
    await reset([], 'sale'); await evaluate('fixture.holdPhotoCamera = true'); await openPhoto();
    await click(button('Start camera')); await waitFor('Boolean(fixture.releasePhotoCamera)');
    await click(closePhoto); await evaluate('fixture.releasePhotoCamera()');
    await waitFor('fixture.photoStreams.every(s => s.getTracks().every(t => t.readyState === "ended"))');
  });
  await check('invalid and oversized photos never reach the API', async () => {
    await reset([], 'sale'); await openPhoto(); await choose('text/plain');
    await waitFor('Boolean(document.querySelector("[role=alert]"))');
    await choose('image/png', 4 * 1024 * 1024 + 1);
    assert.equal(await evaluate('fixture.photoUploads.length'), 0);
  });
  await check('product upload saves multipart image and variants; remove and unchanged URL are distinct', async () => {
    await reset([], 'sale');
    await evaluate("productService.createProduct({name: 'Router', categoryId: '1', image: 'data:image/png;base64,iVBORw0KGgo=', status: 'Active', variants: [{companyId:'1', companyName:'Brand A', basePrice:50, defaultSellingPrice:100, currentStock:5}]})");
    assert.equal(await evaluate('fixture.productWrites[0].multipart'), true);
    assert.equal(await evaluate('fixture.productWrites[0].variants[0].company_id'), 1);
    assert.equal(await evaluate('fixture.productWrites[0].image.type'), 'image/png');
    await evaluate('productService.updateProduct("1", {image: ""})');
    assert.equal(await evaluate('fixture.productWrites[1].image'), null);
    await evaluate('productService.updateProduct("1", {image: "https://fixture/media/router.jpg"})');
    assert.equal(await evaluate('"image" in fixture.productWrites[2]'), false);
  });
  if (visualCss) {
    await check('photo dialog fits mobile and desktop', async () => {
      for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 360, 740]]) {
        await command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: name === 'mobile'});
        await reset([], 'sale'); await openPhoto();
        assert.ok(await evaluate('(() => { const d = document.querySelector("[aria-labelledby=photo-search-title]"); const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && d.scrollWidth <= d.clientWidth; })()'));
        const screenshot = await command('Page.captureScreenshot', {format:'png'});
        writeFileSync(path.resolve('.tmp', 'photo-' + name + '.png'), Buffer.from(screenshot.data, 'base64'));
      }
    });
  }
  console.log('Photo search browser checks passed.');
  await send('Browser.close');
} finally {
  socket?.close();
  browser.kill();
  server.close();
  // Only remove the unique profile directory created by this test, within .tmp.
  if (path.dirname(profile) === path.resolve('.tmp')) {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Chrome may still hold a lock. */ }
  }
}


