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
const profile = mkdtempSync(path.resolve('.tmp/barcode-browser-'));
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
  await check('sale quantity is explicit, repeated frames ignored, and selected quantity reaches sale API', async () => {
    await reset([], 'sale'); await openScanner();
    await evaluate('fixture.cameras.at(-1).callback({getText: () => "0123456789012"}); fixture.cameras.at(-1).callback({getText: () => "0123456789012"})');
    await waitFor('Boolean(document.querySelector("#barcode-quantity"))');
    assert.equal(await evaluate('fixture.lookups.length'), 1);
    assert.ok(await evaluate('fixture.cameras.every(c => c.stopped)'));
    await fill('3', quantity);
    await click(button('Add to sale'));
    await waitFor('!document.querySelector("#barcode-title")');
    await click('document.querySelector("#confirm-complete-sale-btn")');
    await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].items[0].quantity'), 3);
    assert.equal(await evaluate('fixture.sales[0].items[0].product_variant_id'), 1);
  });
  await check('existing cart quantity reduces stock available for subsequent scans', async () => {
    await reset([], 'sale'); await openScanner(); await scan(); await fill('4', quantity);
    await click(button('Add to sale'));
    await openScanner(); await scan();
    assert.equal(await evaluate(quantity + '.max'), '1');
    await fill('2', quantity);
    assert.ok(await evaluate(button('Add to sale') + '.disabled'));
    await fill('0', quantity);
    assert.ok(await evaluate(button('Add to sale') + '.disabled'));
    await fill('1.5', quantity);
    assert.ok(await evaluate(button('Add to sale') + '.disabled'));
    await fill('1', quantity); await click(button('Add to sale'));
    await click('document.querySelector("#confirm-complete-sale-btn")');
    await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].items.length'), 1);
    assert.equal(await evaluate('fixture.sales[0].items[0].quantity'), 5);
  });
  await check('multiple variants require a choice and preserve selected identity', async () => {
    await reset([], 'sale');
    await evaluate('fixture.product.variants.push({...fixture.product.variants[0], id: 2, company: {id: 2, name: "Brand B"}})');
    await openScanner(); await scan();
    assert.ok(await evaluate(button('Add to sale') + '.disabled'));
    assert.equal(await evaluate('document.querySelector("#barcode-variant").value'), '');
    await evaluate('const select = document.querySelector("#barcode-variant"); select.value = "2"; select.dispatchEvent(new Event("change", {bubbles: true}))');
    await waitFor('Boolean(document.querySelector("#barcode-quantity"))');
    await fill('2', quantity); await click(button('Add to sale'));
    await click('document.querySelector("#confirm-complete-sale-btn")'); await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].items[0].product_variant_id'), 2);
  });
  await check('restock permits quantity above stock and merges repeated product selections', async () => {
    await reset([], 'purchase'); await evaluate('fixture.product.variants[0].current_stock = 0');
    await openScanner(); await scan(); await fill('100', quantity); await click(button('Add to restock'));
    await openScanner(); await scan(); await fill('20', quantity); await click(button('Add to restock'));
    await click('document.querySelector("#submit-create-purchase-btn")'); await waitFor('fixture.purchases.length === 1');
    assert.equal(await evaluate('fixture.purchases[0].items.length'), 1);
    assert.equal(await evaluate('fixture.purchases[0].items[0].quantity'), 120);
  });
  await check('out of stock and inactive products cannot be added to sales', async () => {
    await reset([], 'sale'); await evaluate('fixture.product.variants[0].current_stock = 0');
    await openScanner(); await scan();
    assert.ok(await evaluate(button('Add to sale') + '.disabled'));
    await click(button('Scan another'));
    await evaluate('fixture.product.status = "Inactive"');
    await waitFor('Boolean(document.querySelector("video"))');
    await scan();
    assert.ok(await evaluate('document.body.textContent.includes("inactive")'));
    assert.equal(await evaluate('fixture.sales.length'), 0);
  });
  await check('not-found and connection failures are distinct, and retry works', async () => {
    await reset([], 'sale'); await evaluate('fixture.failStatus = 404'); await openScanner(); await scan();
    assert.ok(await evaluate('document.body.textContent.includes("No product matches")'));
    await evaluate('fixture.failStatus = 503'); await click(button('Scan again')); await scan();
    assert.ok(await evaluate('document.body.textContent.includes("Product lookup failed")'));
    await evaluate('fixture.failStatus = 0'); await click(button('Scan again')); await scan();
    assert.ok(await evaluate('Boolean(document.querySelector("#barcode-quantity"))'));
  });
  await check('closing during lookup discards late results and reopening starts fresh', async () => {
    await reset([], 'sale'); await evaluate('fixture.holdLookup = true'); await openScanner();
    await evaluate('fixture.cameras.at(-1).callback({getText: () => "0123456789012"})');
    await waitFor('Boolean(fixture.releaseLookup)');
    await click('document.querySelector("[aria-label=\\"Close barcode scanner\\"]")');
    await evaluate('fixture.holdLookup = false; fixture.releaseLookup()');
    await openScanner();
    assert.equal(await evaluate('document.querySelector("#barcode-quantity")'), null);
    await scan(); await click(button('Add to sale'));
    await click('document.querySelector("#confirm-complete-sale-btn")'); await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].items[0].quantity'), 1);
  });
  await check('closing while camera permission is pending stops the late camera stream', async () => {
    await reset([], 'sale'); await evaluate('fixture.holdCamera = true'); await openScanner();
    await waitFor('Boolean(fixture.releaseCamera)');
    await click('document.querySelector("[aria-label=\\"Close barcode scanner\\"]")');
    // StrictMode starts two permission attempts; resolve every one through the stub.
    await evaluate('fixture.cameras.forEach(c => c.release?.())');
    await waitFor('fixture.cameras.every(c => c.stopped)');
  });
  await check('camera permission denial offers retry and Escape closes only the scanner', async () => {
    await reset([], 'sale'); await evaluate('fixture.cameraDenied = true'); await openScanner();
    await waitFor('document.body.textContent.includes("Camera access denied")');
    await evaluate('fixture.cameraDenied = false'); await click(button('Retry camera')); await scan();
    await key('Escape', 27); await waitFor('!document.querySelector("#barcode-title")');
    assert.ok(await evaluate('Boolean(document.querySelector("#confirm-complete-sale-btn"))'));
  });
  await check('catalogue scanner still opens the matched product', async () => {
    await reset([], 'lookup'); await waitFor('fixture.cameras.length > 0');
    await evaluate('fixture.cameras.at(-1).callback({getText: () => "0123456789012"})');
    await waitFor(`Boolean(${button('View product')})`);
    await click(button('View product')); await waitFor('Boolean(fixture.viewed)');
    assert.equal(await evaluate('fixture.viewed.id'), '1');
  });
  await check('products with no active variants cannot enter the restock draft', async () => {
    await reset([], 'purchase'); await evaluate('fixture.product.variants[0].status = "Inactive"');
    await openScanner();
    await evaluate('fixture.cameras.at(-1).callback({getText: () => "0123456789012"})');
    await waitFor('document.body.textContent.includes("no active variants")');
    assert.ok(await evaluate(button('Add to restock') + '.disabled'));
  });
  await check('quantity confirmation traps keyboard focus and restores it to the scan button', async () => {
    await reset([], 'sale'); await openScanner(); await scan();
    assert.equal(await evaluate('document.activeElement.id'), 'barcode-quantity');
    await evaluate(button('Add to sale') + '.focus()');
    await key('Tab', 9);
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Close barcode scanner');
    await key('Escape', 27);
    assert.equal(await evaluate('document.activeElement.title'), 'Scan barcode with camera');
  });
  console.log('12 barcode workflow browser checks passed.');
  if (visualCss) {
    await check('scanner fits desktop and mobile screens', async () => {
      for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 360, 740]]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: name === 'mobile' });
        await reset([], 'sale'); await openScanner(); await scan();
        assert.ok(await evaluate('(() => { const d = document.querySelector("[aria-labelledby=barcode-title]"); const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && d.scrollWidth <= d.clientWidth; })()'));
        const screenshot = await command('Page.captureScreenshot', { format: 'png' });
        writeFileSync(path.resolve('.tmp', 'barcode-' + name + '.png'), Buffer.from(screenshot.data, 'base64'));
      }
    });
  }
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
