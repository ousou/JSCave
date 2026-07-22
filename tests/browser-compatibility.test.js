const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { probeBrowsers } = require('./support/browsers.js');
const { withTimeout } = require('./support/browser.js');

const root = path.resolve(__dirname, '..');
const capabilities = probeBrowsers();

function serveReport() {
  let resolveReport;
  const reported = new Promise((resolve) => { resolveReport = resolve; });
  const server = http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/report') {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => { resolveReport(JSON.parse(body)); response.writeHead(204).end(); });
      return;
    }
    const relative = request.url === '/' ? 'tests/compatibility-harness.html' : request.url.slice(1).split('?')[0];
    const file = path.resolve(root, relative);
    if (!file.startsWith(root)) return response.writeHead(403).end();
    fs.createReadStream(file).on('error', () => response.writeHead(404).end()).pipe(response);
  });
  return { server, reported };
}

async function portableReport(kind, executable) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `jscave-${kind}-`));
  const { server, reported } = serveReport();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const args = kind === 'chrome'
    ? ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', `--user-data-dir=${profile}`, url]
    : ['--headless', '--no-remote', '--profile', profile, url];
  const child = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
  let diagnostics = '';
  child.stderr.on('data', (chunk) => { diagnostics += chunk; });
  const earlyExit = new Promise((_, reject) => child.once('exit', (code, signal) => reject(new Error(`${kind} exited before reporting (${code ?? signal}):\n${diagnostics}`))));
  try {
    const report = await withTimeout(Promise.race([reported, earlyExit]), 20_000, `${kind} compatibility report timed out`);
    assert.deepEqual({
      scriptLoad: report.scriptLoad, canvasRendered: report.canvasRendered, enterStart: report.enterStart,
      spaceDown: report.spaceDown, spaceUp: report.spaceUp, fixedScale: report.fixedScale, failures: report.failures,
    }, {
      scriptLoad: true, canvasRendered: true, enterStart: true,
      spaceDown: true, spaceUp: true, fixedScale: true, failures: [],
    });
    return report;
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
      await new Promise((resolve) => child.once('exit', resolve));
    }
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

test('Chrome capability is required and passes the portable compatibility harness', { timeout: 30_000 }, async () => {
  assert.ok(capabilities.chrome, `Chrome is required; searched: ${capabilities.searched.chrome.join(', ')}`);
  const report = await portableReport('chrome', capabilities.chrome);
  assert.match(report.userAgent, /Chrome\//);
});

test('Firefox passes portable compatibility assertions when available', {
  timeout: 30_000,
  skip: capabilities.firefox ? false : `Firefox unavailable; searched: ${capabilities.searched.firefox.join(', ')}`,
}, async () => {
  const report = await portableReport('firefox', capabilities.firefox);
  assert.match(report.userAgent, /Firefox\//);
});
