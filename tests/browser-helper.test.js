const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser, withTimeout } = require('./support/browser.js');

const root = path.resolve(__dirname, '..');

function serve() {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    const file = path.join(root, request.url === '/' ? 'index.html' : request.url.split('?')[0]);
    fs.createReadStream(file).on('error', () => response.writeHead(404).end()).pipe(response);
  });
  return { server, requests };
}

test('CDP helper controls file and HTTP pages, input, viewport, pixels, screenshots, and diagnostics', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  const { server, requests } = serve();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await browser.resize(400, 400);
    await browser.navigate(`file://${path.join(root, 'tests/browser-harness.html')}?scale=1`);
    assert.equal(await browser.evaluate('document.querySelector("#game").dataset.ready'), 'true');
    assert.equal(await browser.evaluate('JSCave.test.stopClock(); typeof JSCave.test.snapshot'), 'function');
    assert.equal(await browser.evaluate(`(() => {
      const complete = JSCave.test.useScriptedRandom([{ name: 'title-blue', value: .25 }]);
      JSCave.test.selectFrame('title');
      complete();
      return JSCave.test.snapshot().state;
    })()`), 0);
    const before = await browser.canvasPixels('#game', 0, 0, 1, 1);
    assert.equal(before.length, 4);
    const rect = await browser.evaluate(`(() => {
      const value = document.querySelector('#game').getBoundingClientRect();
      return { x: value.left, y: value.top, width: value.width, height: value.height };
    })()`);
    await browser.pointer('down', rect.x + rect.width / 2, rect.y + rect.height / 2);
    await browser.pointer('up', rect.x + rect.width / 2, rect.y + rect.height / 2);
    assert.equal(await browser.evaluate('JSCave.test.advance().state'), 1, 'title-to-game transition must not freeze');
    assert.equal(await browser.evaluate('JSCave.test.advance().gameCount'), 1);
    await browser.key('Space');
    await browser.key('Space', 'keyUp');
    const png = await browser.screenshot(rect);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

    const { port } = server.address();
    await browser.navigate(`http://127.0.0.1:${port}/`);
    assert.ok(requests.includes('/'));
    assert.ok(browser.networkRequests.some((url) => url === `http://127.0.0.1:${port}/`));
    browser.assertHealthy({
      allowedRequest: (url) => url.startsWith('file:') || url.startsWith(`http://127.0.0.1:${port}/`),
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await browser.close();
  }
  assert.equal(browser.child.exitCode, 0);
  assert.equal(fs.existsSync(browser.profile), false);
});

test('CDP helper reports script failures, console errors, external requests, and bounded timeouts', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.navigate('data:text/html,<script>console.error("bad");setTimeout(()=>{throw new Error("boom")})</script><img src="https://invalid.example/a.png">');
    await browser.evaluate('new Promise(resolve => setTimeout(resolve, 50))');
    assert.throws(() => browser.assertHealthy({ allowedRequest: (url) => url.startsWith('data:') }), /unexpected network requests/);
    assert.throws(() => browser.assertHealthy(), /browser runtime errors/);
    await assert.rejects(withTimeout(new Promise(() => {}), 5, 'sentinel operation'), /sentinel operation after 5 ms/);
  } finally {
    await browser.close();
  }
});
