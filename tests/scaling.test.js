// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const test = require('node:test');
const { LOGICAL_HEIGHT, LOGICAL_WIDTH, applyScale, chooseScale } = require('../src/scaling.js');

test('Auto uses the largest fitting scale, capped at 16', () => {
  assert.equal(chooseScale('auto', 512, 640).scale, 4);
  assert.equal(chooseScale('auto', 9000, 9000).scale, 16);
  assert.equal(chooseScale('auto', 80, 100).scale, 1);
});

test('explicit scales remain fixed and validate their bounds', () => {
  assert.equal(chooseScale(1, 999, 999).scale, 1);
  assert.equal(chooseScale(4, 1, 1).scale, 4);
  for (const invalid of [0, 17, 1.5, '4', null, undefined]) {
    assert.throws(() => chooseScale(invalid, 512, 640), RangeError);
  }
});

test('every scaling decision preserves the logical backing dimensions', () => {
  for (const mode of ['auto', ...Array.from({ length: 16 }, (_, index) => index + 1)]) {
    assert.deepEqual(chooseScale(mode, 512, 640).backing, { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT });
  }
});

test('applying display scale does not assign unchanged backing dimensions', () => {
  let width = LOGICAL_WIDTH; let height = LOGICAL_HEIGHT; let assignments = 0;
  const canvas = {
    get width() { return width; }, set width(value) { assignments += 1; width = value; },
    get height() { return height; }, set height(value) { assignments += 1; height = value; },
    style: {}, dataset: {},
  };
  assert.equal(applyScale(canvas, 4, 10, 10).backingReset, false);
  assert.equal(assignments, 0);
  assert.deepEqual(canvas.style, { width: '512px', height: '640px' });
  width = 1;
  assert.equal(applyScale(canvas, 1, 10, 10).backingReset, true);
  assert.equal(assignments, 1);
  assert.equal(width, LOGICAL_WIDTH);
});
