// Written by Codex on behalf of Sebastian.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { buildStandalone, checkStandalone } = require('../scripts/package.js');

const root = path.resolve(__dirname, '..');

test('standalone build is deterministic, byte-current, and contains no asset references', () => {
  const first = buildStandalone();
  const second = buildStandalone();
  assert.equal(first, second);
  assert.equal(first, fs.readFileSync(path.join(root, 'javacave.html'), 'utf8'));
  assert.equal(checkStandalone(), true);
  assert.doesNotMatch(first, /<(?:script|img)\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(first, /<link\b[^>]*\bhref\s*=/i);
  assert.doesNotMatch(first, /\bhttps?:\/\//i);
  for (const marker of ['JavaCaveScaling', 'JavaCaveEngine', 'JavaCaveRenderer', 'JavaCaveController']) assert.match(first, new RegExp(marker));
});

test('package --check is non-mutating and reports a current artifact', () => {
  const artifact = path.join(root, 'javacave.html');
  const before = fs.readFileSync(artifact);
  const result = spawnSync(process.execPath, ['scripts/package.js', '--check'], { cwd: root, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /up to date/);
  assert.deepEqual(fs.readFileSync(artifact), before);
});
