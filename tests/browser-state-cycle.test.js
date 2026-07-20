// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser } = require('./support/browser.js');

const page = `file://${path.join(__dirname, 'browser-harness.html')}?scale=1`;

function pixelChecksum(pixels) {
  return crypto.createHash('sha256').update(Uint8Array.from(pixels)).digest('hex');
}

async function prepare(browser) {
  await browser.navigate(page);
  await browser.evaluate('JavaCave.test.stopClock(); JavaCave.engine.random = () => .5');
  return browser.evaluate(`(() => { const r = game.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
}

test('pointer-only DOM replay completes collision, delayed return, and second start', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    const point = await prepare(browser);
    await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
    assert.equal(await browser.evaluate('JavaCave.test.advance().state'), 1);
    assert.equal(await browser.evaluate('JavaCave.test.advance().gameCount'), 1);
    await browser.pointer('down', point.x, point.y);
    await browser.evaluate('JavaCave.test.advance(3)');
    await browser.pointer('up', point.x, point.y);
    await browser.evaluate('JavaCave.test.advance(2); JavaCave.engine.y = -100');
    const collision = await browser.evaluate('JavaCave.test.advance()');
    assert.equal(collision.state, 2);
    assert.equal(collision.score, 21);
    await browser.evaluate('JavaCave.test.advance(21)');
    await browser.pointer('down', point.x, point.y);
    assert.equal(await browser.evaluate('JavaCave.test.advance().state'), 0);
    await browser.pointer('up', point.x, point.y);
    await browser.evaluate('JavaCave.test.advance()');
    await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
    assert.equal(await browser.evaluate('JavaCave.test.advance().state'), 1);
    assert.equal(await browser.evaluate('JavaCave.test.advance().gameCount'), 1);
  } finally {
    await browser.close();
  }
});

test('keyboard-only DOM replay keeps Enter out of thrust across a complete restart cycle', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await prepare(browser);
    await browser.evaluate('document.activeElement.blur()'); await browser.key('Tab');
    await browser.key('Enter'); await browser.key('Enter', 'keyUp');
    assert.equal(await browser.evaluate('JavaCave.engine.state'), 1);
    assert.equal(await browser.evaluate('JavaCave.engine.thrusting'), false);
    await browser.evaluate('JavaCave.test.advance()');
    await browser.key('Space'); await browser.evaluate('JavaCave.test.advance(4)'); await browser.key('Space', 'keyUp');
    await browser.evaluate('JavaCave.engine.y = -100');
    assert.equal(await browser.evaluate('JavaCave.test.advance().state'), 2);
    await browser.evaluate('JavaCave.test.advance(21)');
    await browser.key('Enter'); await browser.key('Enter', 'keyUp');
    assert.equal(await browser.evaluate('JavaCave.engine.state'), 0);
    assert.equal(await browser.evaluate('JavaCave.engine.thrusting'), false);
    await browser.key('Enter'); await browser.key('Enter', 'keyUp');
    assert.equal(await browser.evaluate('JavaCave.engine.state'), 1);
    assert.equal(await browser.evaluate('JavaCave.engine.thrusting'), false);
  } finally {
    await browser.close();
  }
});

test('automatic game-over timeout returns on exactly tick 100 without input', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    await prepare(browser);
    await browser.evaluate('JavaCave.engine.releaseInput(); JavaCave.engine.setState(2)');
    assert.deepEqual(await browser.evaluate('JavaCave.test.advance(99)'), {
      state: 2, gameCount: 99, score: 0, highScore: 0,
      pointerPressed: false, pointerClicked: false, keyPressed: false,
      map: Array.from({ length: 4 }, () => Array(32).fill(-1)),
    });
    assert.equal(await browser.evaluate('JavaCave.test.advance().state'), 0);
    assert.equal(await browser.evaluate('JavaCave.engine.gameCount'), 0);
  } finally {
    await browser.close();
  }
});

test('no-tick stress events preserve simulation state and logical canvas pixels', { timeout: 30_000 }, async () => {
  const browser = await CdpBrowser.launch();
  try {
    const point = await prepare(browser);
    await browser.evaluate('JavaCave.test.selectFrame("game")');
    const baselineState = await browser.evaluate(`(() => {
      const s = JavaCave.test.snapshot();
      return {state:s.state,gameCount:s.gameCount,score:s.score,y:s.y,oldY:s.oldY,vy:s.vy,map:s.map};
    })()`);
    const baselinePixels = pixelChecksum(await browser.canvasPixels());
    for (let cycle = 0; cycle < 8; cycle += 1) {
      await browser.pointer('down', point.x, point.y); await browser.key('Space');
      await browser.key('Space', 'keyUp'); await browser.pointer('up', point.x, point.y);
    }
    await browser.touch('start', point.x, point.y); await browser.touch('cancel', point.x, point.y);
    await browser.evaluate('game.focus(); window.dispatchEvent(new Event("blur"))');
    await browser.resize(900, 900);
    await browser.evaluate('new Promise(requestAnimationFrame)');
    await browser.resize(96, 120);
    await browser.evaluate('new Promise(requestAnimationFrame)');
    const finalState = await browser.evaluate(`(() => {
      const s = JavaCave.test.snapshot();
      return {state:s.state,gameCount:s.gameCount,score:s.score,y:s.y,oldY:s.oldY,vy:s.vy,map:s.map};
    })()`);
    assert.deepEqual(finalState, baselineState);
    assert.equal(await browser.evaluate('JavaCave.engine.thrusting'), false);
    assert.equal(pixelChecksum(await browser.canvasPixels()), baselinePixels);
  } finally {
    await browser.close();
  }
});

test('fixed browser state-cycle replay is repeatable', { timeout: 30_000 }, async () => {
  const checksums = [];
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const browser = await CdpBrowser.launch();
    try {
      const point = await prepare(browser);
      await browser.pointer('down', point.x, point.y); await browser.pointer('up', point.x, point.y);
      await browser.evaluate('JavaCave.test.advance(12); JavaCave.engine.y = -100; JavaCave.test.advance(121)');
      checksums.push(pixelChecksum(await browser.canvasPixels()));
    } finally {
      await browser.close();
    }
  }
  assert.equal(new Set(checksums).size, 1);
});
