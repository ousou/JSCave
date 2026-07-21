const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser } = require('./support/browser.js');

const page = `file://${path.join(__dirname, '..', 'index.html')}`;

async function display(browser) {
  return browser.evaluate(`(() => {
    const rect = game.getBoundingClientRect();
    return { width: rect.width, height: rect.height, backingWidth: game.width, backingHeight: game.height,
      scale: game.dataset.scale, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight };
  })()`);
}

async function selectScale(browser, value) {
  await browser.evaluate(`scale.value = ${JSON.stringify(value)}; scale.dispatchEvent(new Event('change', { bubbles: true }))`);
  await browser.evaluate('new Promise(requestAnimationFrame)');
}

test('visible selector implements fixed scales, Auto fitting, resize stability, and overflow', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.resize(800, 1000);
    await browser.navigate(page);
    await browser.evaluate('JavaCave.controller.stop()');
    await selectScale(browser, '1');
    assert.deepEqual(await display(browser), {
      width: 128, height: 160, backingWidth: 128, backingHeight: 160,
      scale: '1', scrollWidth: 800, scrollHeight: 1000,
    });
    await selectScale(browser, '4');
    assert.equal((await display(browser)).width, 512);
    assert.equal((await display(browser)).height, 640);
    await browser.resize(300, 300); await browser.evaluate('new Promise(requestAnimationFrame)');
    assert.equal((await display(browser)).scale, '4');
    assert.equal((await display(browser)).width, 512);
    assert.ok((await display(browser)).scrollWidth >= 512, 'oversized fixed canvas should scroll instead of shrink');
    await browser.resize(800, 1000); await browser.evaluate('new Promise(requestAnimationFrame)');
    await selectScale(browser, 'auto');
    assert.equal((await display(browser)).scale, '6');
    await browser.resize(512, 640); await browser.evaluate('new Promise(requestAnimationFrame)');
    assert.equal((await display(browser)).scale, '4');
    assert.equal((await display(browser)).backingWidth, 128);
    assert.equal((await display(browser)).backingHeight, 160);
  } finally {
    await browser.close();
  }
});

test('selector changes and viewport resize preserve engine identity, state, and logical pixels', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.resize(640, 800); await browser.navigate(page);
    await browser.evaluate(`JavaCave.controller.stop(); window.originalEngine = JavaCave.engine;
      JavaCave.engine.random = () => .5; JavaCave.engine.setState(1); JavaCave.controller.advance()`);
    const state = await browser.evaluate('JavaCave.test?.snapshot?.() ?? ({state:JavaCave.engine.state,gameCount:JavaCave.engine.gameCount,score:JavaCave.engine.score,y:JavaCave.engine.y,map:JavaCave.engine.map})');
    const pixels = await browser.canvasPixels();
    await selectScale(browser, '4');
    await browser.resize(900, 900); await browser.evaluate('new Promise(requestAnimationFrame)');
    await selectScale(browser, 'auto');
    assert.equal(await browser.evaluate('JavaCave.engine === originalEngine'), true);
    assert.deepEqual(await browser.evaluate('({state:JavaCave.engine.state,gameCount:JavaCave.engine.gameCount,score:JavaCave.engine.score,y:JavaCave.engine.y,map:JavaCave.engine.map})'), {
      state: state.state, gameCount: state.gameCount, score: state.score, y: state.y, map: state.map,
    });
    assert.deepEqual(await browser.canvasPixels(), pixels);
    await browser.evaluate('game.width = 1');
    await selectScale(browser, '4');
    assert.equal((await display(browser)).backingWidth, 128);
    assert.deepEqual(await browser.canvasPixels(), pixels, 'a genuine backing repair should repaint immediately');
  } finally {
    await browser.close();
  }
});

for (const forcedScale of [1, 4]) {
  test(`complete pointer cycle remains playable at forced ${forcedScale}×`, { timeout: 30_000 }, async () => {
    const browser = await CdpBrowser.launch();
    try {
      await browser.resize(800, 1000);
      await browser.navigate(`${page}?ignored=1`);
      await browser.evaluate('JavaCave.controller.stop(); JavaCave.engine.random = () => .5');
      await selectScale(browser, String(forcedScale));
      const point = await browser.evaluate(`(() => { const r=game.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
      await browser.evaluate('JavaCave.controller.advance(); JavaCave.controller.advance(); JavaCave.engine.y=-100; JavaCave.controller.advance()');
      assert.equal(await browser.evaluate('JavaCave.engine.state'), 2);
      assert.equal((await display(browser)).scale, String(forcedScale));
    } finally {
      await browser.close();
    }
  });
}
