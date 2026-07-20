// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const test = require('node:test');
const { Engine, STATE } = require('../src/engine.js');

test('title requires a fresh pointer click after release', () => {
  const game = new Engine(() => .5);
  assert.equal(game.state, STATE.TITLE);
  game.pointerDown(); game.tick();
  assert.equal(game.state, STATE.TITLE);
  game.pointerUp(); game.tick();
  game.pointerDown(); game.tick();
  assert.equal(game.state, STATE.GAME);
  assert.equal(game.gameCount, 0);
});

test('input combines pointer and Space and acceleration clamps', () => {
  const game = new Engine(() => .5); game.setState(STATE.GAME);
  game.spaceDown(); game.tick();
  assert.equal(game.vy, -6); assert.equal(game.score, 3);
  game.pointerDown(); game.spaceUp(); assert.equal(game.thrusting, true);
  game.vy = -8; game.tick(); assert.equal(game.vy, -8);
  game.pointerUp(); game.vy = 8; game.tick(); assert.equal(game.vy, 8);
});

test('game cave, obstacle, collision, and automatic restart preserve Java ordering', () => {
  const draws = Array(20).fill(.5); let index = 0;
  const game = new Engine(() => draws[index++] ?? .5); game.setState(STATE.GAME); game.tick();
  assert.equal(game.score, 3); assert.equal(game.map[0].length, 32); assert.equal(index, 1);
  while (game.gameCount < 10) game.tick();
  assert.equal(game.caveHeight, 107); assert.equal(game.map[2][31], 55); assert.equal(index, 11);
  game.y = 0; game.tick(); assert.equal(game.state, STATE.OVER); assert.equal(game.score, 33);
  for (let i = 0; i < 100; i += 1) game.tick();
  assert.equal(game.state, STATE.TITLE);
});

test('collision boundaries retain Java inclusive cave and obstacle edges', () => {
  const game = new Engine(() => .5);
  game.map[0][8] = 10; game.map[1][8] = 90; game.map[2][8] = 40;
  for (const y of [10, 40, 56, 90]) { game.y = y; assert.equal(game.isSafeAtCollisionColumn(), true, `safe at ${y}`); }
  for (const y of [9, 41, 55, 91]) { game.y = y; assert.equal(game.isSafeAtCollisionColumn(), false, `collides at ${y}`); }
});

test('activation is separate from thrust and enforces game-over delay', () => {
  const game = new Engine(() => .5);
  game.activate();
  assert.equal(game.state, STATE.GAME);
  assert.equal(game.thrusting, false);
  game.activate();
  assert.equal(game.state, STATE.GAME);
  game.setState(STATE.OVER);
  game.activate();
  assert.equal(game.state, STATE.OVER);
  for (let tick = 0; tick < 21; tick += 1) game.tick();
  game.activate();
  assert.equal(game.state, STATE.TITLE);
  assert.equal(game.thrusting, false);
  game.activate();
  assert.equal(game.state, STATE.GAME);
});
