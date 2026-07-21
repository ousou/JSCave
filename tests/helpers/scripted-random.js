const assert = require('node:assert/strict');

function scriptedRandom(expectedDraws) {
  let index = 0;
  const random = (name) => {
    const expected = expectedDraws[index];
    assert.ok(expected, `unexpected random draw "${name}" at index ${index}`);
    assert.equal(name, expected.name, `random draw ${index} was out of order`);
    index += 1;
    return expected.value;
  };
  random.assertComplete = () => {
    assert.equal(index, expectedDraws.length, `missing random draw "${expectedDraws[index]?.name}" at index ${index}`);
  };
  random.consumed = () => index;
  return random;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

module.exports = { scriptedRandom, seededRandom };
