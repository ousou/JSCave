const assert = require('node:assert/strict');
const test = require('node:test');
const { Controller } = require('../src/controller.js');
const { Engine, STATE } = require('../src/engine.js');

class Target {
  constructor() { this.listeners = {}; this.hidden = false; this.focused = false; this.captured = new Set(); }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  emit(type, properties = {}) {
    let prevented = false;
    const event = { type, pointerId: 7, code: '', repeat: false, preventDefault() { prevented = true; }, ...properties };
    for (const listener of this.listeners[type] || []) listener(event);
    return { event, prevented };
  }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}

function setup() {
  const canvas = new Target(); const windowTarget = new Target(); const documentTarget = new Target();
  const engine = new Engine(() => .5);
  const controller = new Controller({
    engine, renderer: { render() {} }, canvas, windowTarget, documentTarget,
  });
  controller.bind();
  return { canvas, windowTarget, documentTarget, engine, controller };
}

test('controller runs exactly one tick per 100ms timer and is idempotent', () => {
  let callback; let cleared;
  const scheduler = { setInterval(fn, ms) { callback = fn; assert.equal(ms, 100); return 9; }, clearInterval(id) { cleared = id; } };
  let ticks = 0;
  const controller = new Controller({
    engine: { tick() { ticks += 1; } }, renderer: { render() {} }, scheduler,
    canvas: new Target(), windowTarget: new Target(), documentTarget: new Target(),
  });
  controller.start(); controller.start(); assert.equal(ticks, 1); callback(); assert.equal(ticks, 2);
  controller.stop(); controller.stop(); assert.equal(cleared, 9);
});

test('Enter activates without thrust, ignores repeat, and Space remains thrust-only', () => {
  const { canvas, engine } = setup();
  assert.equal(canvas.emit('keydown', { code: 'Enter', repeat: true }).prevented, true);
  assert.equal(engine.state, STATE.TITLE);
  canvas.emit('keydown', { code: 'Enter' });
  assert.equal(engine.state, STATE.GAME); assert.equal(engine.thrusting, false);
  canvas.emit('keydown', { code: 'Space' });
  assert.equal(engine.state, STATE.GAME); assert.equal(engine.thrusting, true);
  canvas.emit('keyup', { code: 'Enter' });
  assert.equal(engine.thrusting, true);
  canvas.emit('keyup', { code: 'Space' });
  assert.equal(engine.thrusting, false);
});

test('pointer focus/capture and all release paths cannot leave thrust stuck', () => {
  const { canvas, windowTarget, documentTarget, engine } = setup();
  assert.equal(canvas.emit('pointerdown').prevented, true);
  assert.equal(canvas.focused, true); assert.equal(canvas.captured.has(7), true); assert.equal(engine.thrusting, true);
  assert.equal(canvas.emit('pointerup').prevented, true);
  assert.equal(canvas.captured.has(7), false); assert.equal(engine.thrusting, false);
  canvas.emit('pointerdown'); assert.equal(canvas.emit('pointercancel').prevented, true); assert.equal(engine.thrusting, false);
  canvas.emit('keydown', { code: 'Space' }); windowTarget.emit('blur'); assert.equal(engine.thrusting, false);
  canvas.emit('pointerdown'); documentTarget.hidden = true; documentTarget.emit('visibilitychange'); assert.equal(engine.thrusting, false);
});
