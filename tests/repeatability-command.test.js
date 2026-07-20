// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('repeatability command is bounded to at least ten runs of all required suites', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts/repeatability.js'), 'utf8');
  assert.match(source, /iterations < 10/);
  for (const suite of ['engine-characterization', 'browser-state-cycle', 'browser-standalone', 'browser-compatibility']) {
    assert.match(source, new RegExp(suite));
  }
  assert.match(source, /timeout: 60_000/);
  assert.match(source, /browserVersion/);
});
