// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const test = require('node:test');
const { Engine, STATE } = require('../src/engine.js');
const { Renderer } = require('../src/renderer.js');

function context() { const calls = []; return { calls, fillRect(...a) { calls.push(['fillRect', ...a]); }, fillText(...a) { calls.push(['fillText', ...a]); }, fill(...a) { calls.push(['fill', ...a]); }, beginPath() { calls.push(['beginPath']); }, ellipse(...a) { calls.push(['ellipse', ...a]); }, stroke() { calls.push(['stroke']); }, moveTo(...a) { calls.push(['moveTo', ...a]); }, lineTo(...a) { calls.push(['lineTo', ...a]); } }; }
test('renderer produces title, game, and game-over layers', () => {
  const ctx = context(); const renderer = new Renderer(ctx); const game = new Engine(() => .5);
  game.tick(); renderer.render(game); assert.ok(ctx.calls.some((call) => call[0] === 'fillText' && call[1] === 'SFCave'));
  game.setState(STATE.GAME); game.tick(); renderer.render(game); assert.ok(ctx.calls.some((call) => call[0] === 'fillText' && String(call[1]).startsWith('Score :')));
  assert.deepEqual(ctx.calls.filter((call) => call[0] === 'moveTo'), [['moveTo', 30, 49], ['moveTo', 30, 50], ['moveTo', 30, 51]]);
  game.setState(STATE.OVER); game.y = 50; game.tick(); renderer.render(game); assert.ok(ctx.calls.some((call) => call[0] === 'ellipse'));
});
