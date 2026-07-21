const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser } = require('./support/browser.js');

const root = path.resolve(__dirname, '..');
const standalone = `file://${path.join(root, 'javacave.html')}`;

function server() {
  const origins = [];
  const instance = http.createServer((request, response) => {
    origins.push(request.headers.host);
    const relative = request.url === '/' ? 'index.html' : request.url.slice(1).split('?')[0];
    const file = path.resolve(root, relative);
    if (!file.startsWith(root)) return response.writeHead(403).end();
    fs.createReadStream(file).on('error', () => response.writeHead(404).end()).pipe(response);
  });
  return { instance, origins };
}

async function stopAndPoint(browser) {
  await browser.evaluate('JavaCave.controller.stop(); JavaCave.engine.random = () => .5');
  return browser.evaluate(`(() => { const r=game.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
}

test('standalone file starts by pointer and Enter and completes a deterministic transition offline', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.navigate(standalone);
    let point = await stopAndPoint(browser);
    await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
    await browser.evaluate('JavaCave.controller.advance(); JavaCave.controller.advance(); JavaCave.engine.y=-100; JavaCave.controller.advance()');
    assert.equal(await browser.evaluate('JavaCave.engine.state'), 2);

    await browser.navigate(standalone);
    await stopAndPoint(browser);
    await browser.evaluate('game.focus()'); await browser.key('Enter'); await browser.key('Enter', 'keyUp');
    assert.equal(await browser.evaluate('JavaCave.engine.state'), 1);
    assert.equal(await browser.evaluate('JavaCave.engine.thrusting'), false);
    assert.deepEqual(browser.networkRequests, [standalone, standalone]);
    browser.assertHealthy({ allowedRequest: (url) => url === standalone });
  } finally {
    await browser.close();
  }
});

test('source and standalone pages share title, start, scale, and logical-pixel smoke behavior', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  const results = [];
  try {
    for (const url of [`file://${path.join(root, 'index.html')}`, standalone]) {
      await browser.navigate(url);
      const point = await stopAndPoint(browser);
      await browser.evaluate(`scale.value='4'; scale.dispatchEvent(new Event('change'))`);
      const titlePixel = await browser.canvasPixels('#game', 0, 0, 1, 1);
      await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
      await browser.evaluate('JavaCave.controller.advance(); JavaCave.controller.advance()');
      results.push({
        state: await browser.evaluate('JavaCave.engine.state'),
        scale: await browser.evaluate('game.dataset.scale'),
        dimensions: await browser.evaluate('({width:game.width,height:game.height})'),
        titlePixel,
      });
    }
    assert.deepEqual(results[1], results[0]);
    browser.assertHealthy({ allowedRequest: (url) => url.startsWith(`file://${root}/`) });
  } finally {
    await browser.close();
  }
});

test('HTTP source and standalone loads stay on the local origin', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  const { instance, origins } = server();
  await new Promise((resolve) => instance.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${instance.address().port}`;
    for (const pathName of ['/', '/javacave.html']) {
      await browser.navigate(`${origin}${pathName}`);
      await stopAndPoint(browser);
      assert.equal(await browser.evaluate('game.dataset.ready'), 'true');
    }
    assert.ok(origins.length >= 2);
    assert.ok(origins.every((host) => host === `127.0.0.1:${instance.address().port}`));
    browser.assertHealthy({ allowedRequest: (url) => url.startsWith(origin) });
  } finally {
    await new Promise((resolve) => instance.close(resolve));
    await browser.close();
  }
});
