const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('release command verifies a clean export, browsers, packaging, Java, and artifact hygiene', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts/release-verify.js'), 'utf8');
  for (const evidence of [
    "['status', '--porcelain']",
    "['ls-tree', '-r', '--name-only', '-z', 'HEAD']",
    "name.endsWith('.test.js')",
    "name.startsWith('browser-')",
    "['scripts/package.js', '--check']",
    "['-Xlint:all', '-d', classes, 'JavaCave.java']",
    'assertNoUnexpectedArtifacts',
    'trackedSnapshot(root)',
  ]) assert.match(source, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source, /Firefox: SKIP/);
  assert.match(source, /worktree must be clean/);
});
