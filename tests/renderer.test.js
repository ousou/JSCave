// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const test = require('node:test');
const { Engine, STATE } = require('../src/engine.js');
const { Renderer } = require('../src/renderer.js');

function context() {
  const calls = [];
  const ctx = { calls };
  for (const property of ['fillStyle', 'strokeStyle', 'font', 'textBaseline', 'lineWidth']) {
    let value;
    Object.defineProperty(ctx, property, {
      get() { return value; },
      set(next) { value = next; calls.push(['set', property, next]); },
      enumerable: true,
    });
  }
  for (const method of ['fillRect', 'fillText', 'fill', 'beginPath', 'ellipse', 'stroke', 'moveTo', 'lineTo']) {
    ctx[method] = (...args) => calls.push([method, ...args]);
  }
  return ctx;
}

test('title renderer records exact properties, colors, fonts, coordinates, and layer order', () => {
  const ctx = context(); const renderer = new Renderer(ctx);
  renderer.render({ state: STATE.TITLE, gameCount: 1, titleBlue: 32, titleRadius: 40, score: 9, highScore: 12 });
  assert.deepEqual(ctx.calls.slice(0, 11), [
    ['set', 'textBaseline', 'alphabetic'], ['set', 'lineWidth', 1],
    ['set', 'fillStyle', 'rgb(128,128,255)'], ['set', 'strokeStyle', 'rgb(128,128,255)'],
    ['fillRect', 0, 0, 128, 160],
    ['set', 'fillStyle', 'rgb(0,32,128)'], ['set', 'strokeStyle', 'rgb(0,32,128)'],
    ['beginPath'], ['ellipse', 64, 64, 40, 40, 0, 0, Math.PI * 2], ['fill'],
    ['set', 'font', 'bold 32px Times New Roman'],
  ]);
  assert.deepEqual(ctx.calls.filter((call) => call[0] === 'fillText'), [
    ['fillText', 'SFCave', 15, 50], ['fillText', 'SFCave', 10, 45],
    ['fillText', 'Click to start!', 10, 80], ['fillText', 'Score   : 9', 10, 110],
    ['fillText', 'HiScore : 12', 10, 130],
  ]);
  assert.ok(ctx.calls.indexOf(ctx.calls.find((call) => call[0] === 'fill')) < ctx.calls.indexOf(ctx.calls.find((call) => call[0] === 'fillText')));
});

test('game renderer records stripes, opening, obstacle, score, and all three ordered player lines', () => {
  const ctx = context(); const renderer = new Renderer(ctx); const game = new Engine(() => .5);
  game.setState(STATE.GAME); game.tick();
  game.map[0][3] = 10; game.map[1][3] = 90; game.map[2][3] = 30;
  renderer.render(game);
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillRect,12,0,4,128'));
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillRect,12,10,4,80'));
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillRect,12,30,4,16'));
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillRect,0,128,128,32'));
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillText,Score : 3,20,150'));
  const playerStart = ctx.calls.findIndex((call) => call.join(',') === 'fillRect,30,49,1,1');
  const playerMiddle = ctx.calls.findIndex((call) => call.join(',') === 'fillRect,30,50,1,1');
  const playerEnd = ctx.calls.findIndex((call) => call.join(',') === 'fillRect,30,51,1,1');
  assert.ok(playerStart >= 0 && playerStart < playerMiddle && playerMiddle < playerEnd);
});

test('game renderer preserves the growing worm trail all the way to the left edge', () => {
  const ctx = context(); const renderer = new Renderer(ctx); const game = new Engine(() => .5);
  game.setState(STATE.GAME); game.tick();
  game.wormSegments = Array.from({ length: 9 }, () => ({ startY: 50, endY: 50 }));
  renderer.render(game);
  const middleLineXs = new Set(ctx.calls
    .filter((call) => call[0] === 'fillRect' && call[2] === 50 && call[3] === 1 && call[4] === 1)
    .map((call) => call[1]));
  assert.deepEqual([...middleLineXs].sort((left, right) => left - right),
    Array.from({ length: 37 }, (_, index) => index - 2));
});

test('death renderer records rings 1–19, GameOver, and conditional HiScore at tick 20', () => {
  const ctx = context(); const renderer = new Renderer(ctx);
  const game = { state: STATE.OVER, gameCount: 0, y: 50, score: 30, highScore: 20 };
  for (let tick = 1; tick <= 20; tick += 1) { game.gameCount = tick; renderer.render(game); }
  assert.deepEqual(ctx.calls.filter((call) => call[0] === 'ellipse').map((call) => call.slice(1, 5)),
    Array.from({ length: 19 }, (_, index) => [32, 50, (index + 1) * 2, (index + 1) * 2]));
  assert.deepEqual(ctx.calls.filter((call) => call[0] === 'fillText').slice(-2), [
    ['fillText', 'GameOver', 7, 50], ['fillText', 'HiScore!!', 13, 100],
  ]);
  const noHighScore = context(); const other = new Renderer(noHighScore);
  other.render({ state: STATE.OVER, gameCount: 20, y: 50, score: 20, highScore: 20 });
  assert.deepEqual(noHighScore.calls.filter((call) => call[0] === 'fillText'), [['fillText', 'GameOver', 7, 50]]);
});

test('renderer retains the previous frame while a newly entered state awaits its first tick', () => {
  const ctx = context(); const renderer = new Renderer(ctx); const game = new Engine(() => .5);
  game.tick(); renderer.render(game);
  const callCount = ctx.calls.length;
  game.pointerDown(); game.tick();
  assert.equal(game.state, STATE.GAME);
  assert.equal(game.gameCount, 0);
  renderer.render(game);
  assert.equal(ctx.calls.length, callCount);
});
