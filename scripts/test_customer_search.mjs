// Browser regression checks using Chrome's native debugging protocol and Node's
// built-in WebSocket. No driver download or live API/database is required.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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
const { outputFiles } = await build({ entryPoints: ['tests/customer-search.fixture.tsx'], bundle: true,
  write: false, format: 'iife', define: { 'import.meta.env.VITE_API_BASE_URL': '"http://fixture/api/v1"' } });
console.log('Starting fixture server...');
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/fixture.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/fixture.js' ? outputFiles[0].text
    : '<html><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
mkdirSync('.tmp', { recursive: true });
const profile = mkdtempSync(path.resolve('.tmp/customer-browser-'));
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
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
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
    await evaluate('delete window.fixture');
    await command('Page.navigate', { url: `${origin}/${sale ? '?sale' : ''}` });
    await waitFor('Boolean(window.fixture && document.querySelector("input"))');
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
  const options = '[...document.querySelectorAll("[role=option]")]';
  const createOption = `${options}.find(element => element.textContent.includes('Create "'))`;
  const row = (id, name, phone = null) => ({ id, name, phone, status: 'Active', outstanding_debt: 25 });
  const check = async (name, action) => { await action(); console.log(`PASS ${name}`); };

  await check('name-only creation, repeated clicks, immediate selection and cache invalidation', async () => {
    await reset(); await fill('  New Customer  ');
    await waitFor(`Boolean(${createOption})`);
    await evaluate('fixture.holdPost = true');
    await click(createOption);
    await waitFor('fixture.posts.length === 1');
    // Repeated keyboard/mouse activation while pending must not create again.
    await key('Enter', 13);
    assert.equal(await evaluate(`${field}.readOnly`), true);
    assert.equal(await evaluate(`Boolean(${createOption})`), false);
    assert.equal(await evaluate('fixture.posts.length'), 1);
    assert.deepEqual(await evaluate('fixture.posts[0]'), { name: 'New Customer', email: '', address: '', notes: '' });
    await evaluate('fixture.pendingPost()');
    await waitFor('document.querySelector("#selection").textContent === "999"');
    assert.equal(await evaluate('cacheIsCleared()'), true);
    await click('[...document.querySelectorAll("button")].find(element => element.textContent === "Cancel sale")');
    assert.equal(await evaluate('fixture.rows.length'), 1);
  });
  await check('all result pages, duplicate exact names, keyboard selection, edit clears selection', async () => {
    await reset([...Array.from({ length: 100 }, (_, index) => row(index + 1, 'Alex Other')),
      row(101, ' Alex ', '08012345678'), row(102, 'ALEX')]);
    await fill(' alex ');
    await waitFor(`${options}.length === 102`);
    assert.equal(await evaluate(`Boolean(${createOption})`), false);
    assert.equal(await evaluate('fixture.gets.includes("alex:2")'), true);
    await key('ArrowUp', 38); await key('Enter', 13);
    await waitFor('document.querySelector("#selection").textContent === "102"');
    await fill('Another');
    assert.equal(await evaluate('document.querySelector("#selection").textContent'), 'none');
    await key('Escape', 27);
    assert.equal(await evaluate(`${field}.getAttribute('aria-expanded')`), 'false');
  });
  await check('failed second page blocks creation and retry restores search', async () => {
    await reset(Array.from({ length: 101 }, (_, index) => row(index + 1, 'Page Customer')));
    await evaluate('fixture.failPage = 2'); await fill('Page');
    await waitFor('document.body.textContent.includes("Customer search failed")');
    assert.equal(await evaluate(`Boolean(${createOption})`), false);
    assert.equal(await evaluate(`${options}.length`), 0);
    await evaluate('fixture.failPage = 0');
    await click('[...document.querySelectorAll("button")].find(element => element.textContent === "Retry search")');
    await waitFor(`${options}.length === 102`);
  });
  await check('outdated responses cannot replace a newer query', async () => {
    await reset([row(1, 'Old'), row(2, 'Current')]);
    await evaluate('fixture.slowQuery = "Old"'); await fill('Old');
    await waitFor('fixture.held.length === 1'); await fill('Current');
    await waitFor(`${options}.some(element => element.textContent.includes('Current'))`);
    await evaluate('fixture.held[0]()');
    // Wait for the old response and React updates to pass through the event loop.
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal(await evaluate(`${options}.some(element => element.textContent.includes('Old'))`), false);
  });
  await check('recheck finds a newly saved same-name customer and requires selection', async () => {
    await reset(); await fill('Existing'); await waitFor(`Boolean(${createOption})`);
    await evaluate(`fixture.rows.push(${JSON.stringify(row(10, ' EXISTING '))})`);
    await click(createOption); await waitFor(`${options}.length === 1`);
    assert.equal(await evaluate('fixture.posts.length'), 0);
    assert.equal(await evaluate('document.querySelector("#selection").textContent'), 'none');
    await click(`${options}[0]`);
    await waitFor('document.querySelector("#selection").textContent === "10"');
  });
  await check('failed creation recheck and inactive exact match cannot create', async () => {
    await reset(); await fill('Blocked'); await waitFor(`Boolean(${createOption})`);
    await evaluate('fixture.fail = true'); await click(createOption);
    await waitFor('document.body.textContent.includes("Unable to create customer")');
    assert.equal(await evaluate('fixture.posts.length'), 0);
    await reset([{ ...row(1, 'Blocked'), status: 'Inactive' }]); await fill('Blocked');
    await waitFor(`${options}.length === 1`); await key('ArrowDown', 40); await key('Enter', 13);
    assert.equal(await evaluate('document.querySelector("#selection").textContent'), 'none');
    assert.equal(await evaluate(`Boolean(${createOption})`), false);
  });
  await check('created customer ID reaches the actual sale request', async () => {
    await reset([], true);
    await fill('Router', 'document.querySelector("#sale-product-search-input")');
    await waitFor('Boolean(document.querySelector("#select-variant-1"))');
    await click('document.querySelector("#select-variant-1")');
    await click('document.querySelector("#select-registered-customer-option input")');
    await fill('Sale Customer'); await waitFor(`Boolean(${createOption})`); await click(createOption);
    await waitFor('document.body.textContent.includes("Customer selected.")');
    await click('document.querySelector("#confirm-complete-sale-btn")');
    await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].customer_id'), 999);
    assert.equal(await evaluate('Number(fixture.sales[0].amount_paid)'), 100);
  });
  await check('walk-in selection clears the registered customer and submits no customer ID', async () => {
    await reset([row(5, 'Known')], true);
    await fill('Router', 'document.querySelector("#sale-product-search-input")');
    await waitFor('Boolean(document.querySelector("#select-variant-1"))');
    await click('document.querySelector("#select-variant-1")');
    await click('document.querySelector("#select-registered-customer-option input")');
    await fill('Known'); await waitFor(`${options}.length === 1`); await key('ArrowDown', 40); await key('Enter', 13);
    await click('document.querySelector("#select-walking-customer-option input")');
    await click('document.querySelector("#confirm-complete-sale-btn")');
    await waitFor('fixture.sales.length === 1');
    assert.equal(await evaluate('fixture.sales[0].customer_id'), null);
  });
  console.log('8 browser regression checks passed.');
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
