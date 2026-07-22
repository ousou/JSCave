#!/usr/bin/env node
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { browserVersion, probeBrowsers } = require('../tests/support/browsers.js');

const root = path.resolve(__dirname, '..');
const exportedMode = process.argv.includes('--exported');

function run(command, arguments_, options = {}) {
  if (!options.quiet) process.stdout.write(`\n> ${command} ${arguments_.join(' ')}\n`);
  const result = spawnSync(command, arguments_, {
    cwd: options.cwd || root,
    encoding: options.encoding === undefined ? 'utf8' : options.encoding,
    timeout: options.timeout || 120_000,
    maxBuffer: 20 * 1024 * 1024,
    env: options.env || process.env,
    stdio: options.stdio,
  });
  if (!options.quiet && options.stdio !== 'inherit') {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${arguments_.join(' ')} exited ${result.status}`);
  return result;
}

function trackedSnapshot(directory) {
  const snapshot = {};
  const visit = (relative = '') => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (child !== '.git') visit(child);
      } else {
        snapshot[child] = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, child))).digest('hex');
      }
    }
  };
  visit();
  return snapshot;
}

function assertNoUnexpectedArtifacts(directory) {
  const forbiddenDirectories = new Set(['node_modules', 'vendor', 'dist', 'build', 'target', '__pycache__']);
  const forbiddenExtensions = new Set(['.class', '.jar', '.war', '.exe', '.dll', '.so', '.dylib']);
  const visit = (relative = '') => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (child === '.git') continue;
        assert.equal(forbiddenDirectories.has(entry.name), false, `unexpected generated directory: ${child}`);
        visit(child);
      } else {
        assert.equal(forbiddenExtensions.has(path.extname(entry.name)), false, `unexpected binary artifact: ${child}`);
      }
    }
  };
  visit();
}

function exportHead(destination) {
  const listed = run('git', ['ls-tree', '-r', '--name-only', '-z', 'HEAD'], { cwd: root, encoding: null, quiet: true });
  for (const relative of listed.stdout.toString().split('\0').filter(Boolean)) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = run('git', ['show', `HEAD:${relative}`], { cwd: root, encoding: null, quiet: true });
    fs.writeFileSync(target, content.stdout);
  }
}

function verifyExport() {
  const before = trackedSnapshot(root);
  assertNoUnexpectedArtifacts(root);
  const capabilities = probeBrowsers();
  assert.ok(capabilities.chrome, `Chrome is required; searched: ${capabilities.searched.chrome.join(', ')}`);
  process.stdout.write(`Chrome: ${browserVersion(capabilities.chrome)}\n`);
  process.stdout.write(capabilities.firefox
    ? `Firefox: ${browserVersion(capabilities.firefox)}\n`
    : `Firefox: SKIP (searched: ${capabilities.searched.firefox.join(', ')})\n`);
  const environment = {
    ...process.env, CHROME_BIN: capabilities.chrome,
    ...(capabilities.firefox ? { FIREFOX_BIN: capabilities.firefox } : {}),
  };
  const unitTests = fs.readdirSync(path.join(root, 'tests'))
    .filter((name) => name.endsWith('.test.js') && !name.startsWith('browser-'))
    .map((name) => `tests/${name}`);
  run(process.execPath, ['--test', ...unitTests], { env: environment });
  const browserTests = fs.readdirSync(path.join(root, 'tests'))
    .filter((name) => name.startsWith('browser-') && name.endsWith('.test.js'))
    .sort();
  for (const browserTest of browserTests) run(process.execPath, [`tests/${browserTest}`], { env: environment });
  run(process.execPath, ['scripts/package.js', '--check'], { env: environment });
  const classes = fs.mkdtempSync(path.join(os.tmpdir(), 'JavaCave-classes-'));
  try {
    run('javac', ['-Xlint:all', '-d', classes, 'JavaCave.java']);
  } finally {
    fs.rmSync(classes, { recursive: true, force: true });
  }
  assertNoUnexpectedArtifacts(root);
  assert.deepEqual(trackedSnapshot(root), before, 'release verification modified the exported source');
  process.stdout.write('\nRelease verification passed without modifying the export.\n');
}

if (exportedMode) {
  verifyExport();
} else {
  const statusBefore = run('git', ['status', '--porcelain'], { cwd: root }).stdout;
  assert.equal(statusBefore, '', 'worktree must be clean before release verification');
  const exported = fs.mkdtempSync(path.join(os.tmpdir(), 'jscave-release-'));
  try {
    exportHead(exported);
    run(process.execPath, ['scripts/release-verify.js', '--exported'], {
      cwd: exported, timeout: 300_000, stdio: 'inherit',
    });
  } finally {
    fs.rmSync(exported, { recursive: true, force: true });
  }
  const statusAfter = run('git', ['status', '--porcelain'], { cwd: root }).stdout;
  assert.equal(statusAfter, '', 'release verification left the worktree dirty');
  process.stdout.write('\nClean exported HEAD verification passed.\n');
}
