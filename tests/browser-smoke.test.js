const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_BIN || 'google-chrome';

function load(url, width, height, expectedScale, expectGameStarted = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    `--window-size=${width},${height}`, '--virtual-time-budget=250', '--dump-dom', url,
    ], { cwd: root });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => child.kill(), 20_000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status) => {
      clearTimeout(timeout);
      try {
        assert.equal(status, 0, stderr);
        assert.match(stdout, /id="game"[^>]*width="128"[^>]*height="160"/);
        assert.match(stdout, /data-ready="true"/);
        if (expectedScale) assert.match(stdout, new RegExp(`data-scale="${expectedScale}"`));
        if (expectGameStarted) assert.match(stdout, /data-game-started="true"/);
        assert.doesNotMatch(stderr, /https?:\/\//);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function staticServer() {
  return http.createServer((request, response) => {
    const relative = request.url === '/' ? 'index.html' : request.url.slice(1);
    const file = path.resolve(root, relative);
    if (!file.startsWith(root)) return response.writeHead(403).end();
    require('node:fs').createReadStream(file).on('error', () => response.writeHead(404).end()).pipe(response);
  });
}

test('browser shell loads locally from file and HTTP without external resources', async () => {
  await load(`file://${path.join(root, 'index.html')}`, 640, 800, 4);
  await load(`file://${path.join(root, 'tests/browser-harness.html')}?scale=1&start=1`, 400, 400, 1, true);
  await load(`file://${path.join(root, 'tests/browser-harness.html')}?scale=4`, 400, 400, 4);
  const server = staticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await load(`http://127.0.0.1:${port}/`, 800, 1000, 5);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
