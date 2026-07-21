const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CHROME_NAMES = ['google-chrome', 'chromium', 'chromium-browser'];
const FIREFOX_NAMES = ['firefox', 'firefox-esr'];

function findOnPath(name) {
  if (!name) return null;
  if (name.includes(path.sep)) {
    try { fs.accessSync(name, fs.constants.X_OK); return name; } catch { return null; }
  }
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try { fs.accessSync(candidate, fs.constants.X_OK); return candidate; } catch {}
  }
  return null;
}

function probeBrowsers(environment = process.env) {
  const chromeNames = [...new Set([environment.CHROME_BIN, ...CHROME_NAMES].filter(Boolean))];
  const firefoxNames = [...new Set([environment.FIREFOX_BIN, ...FIREFOX_NAMES].filter(Boolean))];
  return {
    chrome: chromeNames.map(findOnPath).find(Boolean) || null,
    firefox: firefoxNames.map(findOnPath).find(Boolean) || null,
    searched: { chrome: chromeNames, firefox: firefoxNames },
  };
}

function browserVersion(executable) {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 10_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} --version failed: ${result.stderr}`);
  return `${result.stdout}${result.stderr}`.trim();
}

module.exports = { CHROME_NAMES, FIREFOX_NAMES, browserVersion, probeBrowsers };
