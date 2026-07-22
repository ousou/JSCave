const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('browser shell declares a local accessible logical canvas', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(html, /<canvas[^>]+width="128"[^>]+height="160"/);
  assert.match(html, /aria-label="JSCave game\. Enter to start or restart; hold Space or pointer to fly\."/);
  assert.match(html, /Enter to start\/restart; hold Space or pointer to fly/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(css, /image-rendering:\s*pixelated/);
});

test('scale selector exposes Auto followed by every integer scale through 16×', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const options = [...html.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(options, [
    ['auto', 'Auto'],
    ...Array.from({ length: 16 }, (_, index) => [String(index + 1), `${index + 1}×`]),
  ]);
});
