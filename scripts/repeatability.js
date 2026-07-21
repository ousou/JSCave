#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { browserVersion, probeBrowsers } = require('../tests/support/browsers.js');

const root = path.resolve(__dirname, '..');
const iterations = Number(process.argv[2] || 10);
if (!Number.isInteger(iterations) || iterations < 10) throw new RangeError('repeatability requires at least 10 iterations');
const capabilities = probeBrowsers();
if (!capabilities.chrome) throw new Error(`Chrome is required; searched: ${capabilities.searched.chrome.join(', ')}`);
process.stdout.write(`Chrome: ${browserVersion(capabilities.chrome)}\n`);
process.stdout.write(capabilities.firefox
  ? `Firefox: ${browserVersion(capabilities.firefox)}\n`
  : `Firefox: SKIP (searched: ${capabilities.searched.firefox.join(', ')})\n`);

const suites = [
  'tests/engine-characterization.test.js',
  'tests/browser-state-cycle.test.js',
  'tests/browser-standalone.test.js',
  'tests/browser-compatibility.test.js',
];
for (let iteration = 1; iteration <= iterations; iteration += 1) {
  for (const suite of suites) {
    const result = spawnSync(process.execPath, [suite], {
      cwd: root, encoding: 'utf8', timeout: 60_000,
      env: { ...process.env, CHROME_BIN: capabilities.chrome, ...(capabilities.firefox ? { FIREFOX_BIN: capabilities.firefox } : {}) },
    });
    if (result.error || result.status !== 0) {
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      throw result.error || new Error(`repeatability iteration ${iteration} failed: ${suite} exited ${result.status}`);
    }
  }
  process.stdout.write(`repeatability ${iteration}/${iterations}: pass\n`);
}
