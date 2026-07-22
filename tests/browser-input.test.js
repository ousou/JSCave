const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser } = require('./support/browser.js');

const page = `file://${path.join(__dirname, 'browser-harness.html')}?scale=1`;

async function state(browser) {
  return browser.evaluate('JSCave.test.snapshot()');
}

test('real canvas input preserves focus, prevention, capture, and exact engine input state', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.navigate(page);
    await browser.evaluate(`JSCave.test.stopClock(); JSCave.engine.setState(0);
      window.inputEvents = [];
      for (const type of ['pointerdown','pointerup','pointercancel','keydown','keyup']) {
        document.querySelector('#game').addEventListener(type, event => inputEvents.push({type, code:event.code, cancelable:event.cancelable, prevented:event.defaultPrevented}));
      }`);
    await browser.evaluate('document.activeElement.blur()');
    await browser.key('Tab');
    assert.equal(await browser.evaluate('document.activeElement.id'), 'game');

    await browser.key('Enter', 'keyDown', { repeat: true });
    assert.equal((await state(browser)).state, 0);
    await browser.key('Enter');
    assert.deepEqual({ state: (await state(browser)).state, thrusting: await browser.evaluate('JSCave.engine.thrusting') }, { state: 1, thrusting: false });
    await browser.key('Enter', 'keyUp');
    assert.equal(await browser.evaluate('JSCave.engine.thrusting'), false);
    await browser.key('Space');
    assert.equal((await state(browser)).keyPressed, true);
    await browser.key('Space', 'keyUp');
    assert.equal((await state(browser)).keyPressed, false);

    const point = await browser.evaluate(`(() => { const r = game.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await browser.pointer('down', point.x, point.y);
    assert.equal((await state(browser)).pointerPressed, true);
    assert.equal(await browser.evaluate('document.activeElement.id'), 'game');
    assert.equal(await browser.evaluate('game.hasPointerCapture?.(1) ?? true'), true);
    await browser.pointer('up', point.x, point.y);
    assert.equal((await state(browser)).pointerPressed, false);
    await browser.touch('start', point.x, point.y);
    assert.equal((await state(browser)).pointerPressed, true);
    await browser.touch('cancel', point.x, point.y);
    assert.equal((await state(browser)).pointerPressed, false);
    assert.equal(await browser.evaluate('inputEvents.some(event => event.type === "pointercancel")'), true);
    assert.equal(await browser.evaluate('inputEvents.filter(event => event.cancelable).every(event => event.prevented)'), true);
  } finally {
    await browser.close();
  }
});

test('blur, hidden page, selector focus, and rapid alternating input release thrust', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await browser.navigate(page);
    await browser.evaluate('JSCave.test.stopClock(); game.focus()');
    const canvasCenter = () => browser.evaluate(`(() => {
      const r = game.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    await browser.key('Space');
    await browser.evaluate('window.dispatchEvent(new Event("blur"))');
    assert.equal(await browser.evaluate('JSCave.engine.thrusting'), false);

    let point = await canvasCenter();
    await browser.pointer('down', point.x, point.y);
    await browser.evaluate(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'))`);
    assert.equal(await browser.evaluate('JSCave.engine.thrusting'), false);
    await browser.pointer('up', point.x, point.y);

    assert.equal(await browser.evaluate(`(() => {
      const selector = document.createElement('select'); selector.id = 'other';
      selector.innerHTML = '<option>choice</option>'; document.body.append(selector); selector.focus();
      let prevented = null; selector.addEventListener('keydown', event => { prevented = event.defaultPrevented; });
      window.selectorPrevented = () => prevented; return document.activeElement.id;
    })()`), 'other');
    await browser.key('Space');
    assert.equal(await browser.evaluate('selectorPrevented()'), false);
    assert.equal(await browser.evaluate('JSCave.engine.keyPressed'), false);
    await browser.key('Space', 'keyUp');

    await browser.evaluate('game.focus()');
    point = await canvasCenter();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await browser.key('Space'); await browser.pointer('down', point.x, point.y);
      await browser.key('Space', 'keyUp'); await browser.pointer('up', point.x, point.y);
    }
    assert.equal(await browser.evaluate('JSCave.engine.thrusting'), false);
  } finally {
    await browser.close();
  }
});
