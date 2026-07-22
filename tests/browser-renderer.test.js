const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CdpBrowser } = require('./support/browser.js');
const { decodePng } = require('./support/png.js');

const root = path.resolve(__dirname, '..');
const page = `file://${path.join(__dirname, 'browser-harness.html')}`;
const frames = ['title', 'initial-game', 'mid-game', 'collision', 'game-over'];
const expectedChecksums = {
  title: '3a56792a269832f53a20830a9fd61e13995732af691bb97988e56b52a0fa24fe',
  'initial-game': '64ac45f429de8e9cdecc657e645b1eb0374a1f74b58bf6bd119a52ff7c2cf942',
  'mid-game': '3f326be3b1e5a7437e7462c3c3aa212b2e87111567228bf75d293db58201f4f3',
  collision: 'dc3869660cee6313fe601d88ab0a011352bb7789c4098ed8e18d03acbf75e23c',
  'game-over': '9d830aa132b220cf1fc683d83b5819f763115b0316ac98ad090262f52f2ce3af',
};

function fontRectangles(frame) {
  const rectangles = [];
  if (frame === 'title') rectangles.push([0, 15, 128, 42], [0, 62, 128, 22], [0, 92, 128, 42]);
  if (frame !== 'title') rectangles.push([0, 128, 128, 32]);
  if (frame === 'game-over') rectangles.push([0, 25, 128, 32], [0, 75, 128, 32]);
  return rectangles;
}

function maskedChecksum(frame, pixels) {
  const copy = Uint8Array.from(pixels);
  const rectangles = fontRectangles(frame);
  for (const [left, top, width, height] of rectangles) {
    for (let y = top; y < top + height; y += 1) for (let x = left; x < left + width; x += 1) {
      copy.fill(0, (y * 128 + x) * 4, (y * 128 + x + 1) * 4);
    }
  }
  return crypto.createHash('sha256').update(copy).digest('hex');
}

function pixel(decoded, x, y) {
  return [...decoded.pixels.subarray((y * decoded.width + x) * 4, (y * decoded.width + x + 1) * 4)];
}

function assertNearestExpansion(frame, logical, enlarged, scale) {
  assert.equal(enlarged.width, logical.width * scale);
  assert.equal(enlarged.height, logical.height * scale);
  for (let y = 0; y < logical.height; y += 1) for (let x = 0; x < logical.width; x += 1) {
    if (fontRectangles(frame).some(([left, top, width, height]) => x >= left && x < left + width && y >= top && y < top + height)) continue;
    const blockColor = pixel(enlarged, x * scale, y * scale);
    for (let blockY = 0; blockY < scale; blockY += 1) for (let blockX = 0; blockX < scale; blockX += 1) {
      assert.deepEqual(pixel(enlarged, x * scale + blockX, y * scale + blockY), blockColor,
        `nearest-neighbor block is not uniform at logical ${x},${y}`);
    }
    const logicalColor = pixel(logical, x, y);
    for (let channel = 0; channel < 4; channel += 1) {
      assert.ok(Math.abs(blockColor[channel] - logicalColor[channel]) <= 1,
        `scaled color drift at logical ${x},${y}, channel ${channel}`);
    }
  }
}

test('named frames have stable logical pixels and reviewed 1×/4× screenshots', { timeout: 60_000 }, async () => {
  const captures = new Map();
  for (const scale of [1, 4]) {
    const browser = await CdpBrowser.launch();
    try {
      await browser.resize(800, 1000);
      await browser.navigate(`${page}?scale=${scale}`);
      await browser.evaluate('JSCave.test.stopClock(); JSCave.engine.random = () => .5');
      for (const frame of frames) {
        await browser.evaluate(`JSCave.test.selectFrame(${JSON.stringify(frame)})`);
        const logicalPixels = await browser.canvasPixels();
        const checksum = maskedChecksum(frame, logicalPixels);
        if (process.env.UPDATE_REFERENCES === '1') process.stderr.write(`${frame}=${checksum}\n`);
        else assert.equal(checksum, expectedChecksums[frame], `${frame} masked checksum`);
        const landmarks = {
          topLeft: logicalPixels.slice(0, 4),
          lowerLeft: logicalPixels.slice((159 * 128) * 4, (159 * 128) * 4 + 4),
        };
        if (frame === 'title') {
          assert.deepEqual(landmarks.topLeft, [128, 128, 255, 255]);
          assert.deepEqual(logicalPixels.slice((90 * 128 + 64) * 4, (90 * 128 + 65) * 4), [0, 32, 128, 255]);
        } else {
          assert.deepEqual(landmarks.lowerLeft, [128, 128, 255, 255]);
          assert.ok(new Set(logicalPixels.filter((_, index) => index % 4 !== 3)).size > 4);
        }
        const rect = await browser.evaluate(`(() => { const r=game.getBoundingClientRect(); return {x:r.left,y:r.top,width:r.width,height:r.height}; })()`);
        const png = await browser.screenshot(rect);
        const decoded = decodePng(png);
        assert.equal(decoded.width, 128 * scale); assert.equal(decoded.height, 160 * scale);
        const referencePath = path.join(root, 'reference', `browser-${frame}-${scale}x.png`);
        if (process.env.UPDATE_REFERENCES === '1') fs.writeFileSync(referencePath, png);
        assert.ok(fs.existsSync(referencePath), `missing reviewed reference ${path.relative(root, referencePath)}`);
        assert.deepEqual(decodePng(fs.readFileSync(referencePath)).pixels, decoded.pixels);
        captures.set(`${frame}-${scale}`, decoded);
      }
      browser.assertHealthy({ allowedRequest: (url) => url.startsWith('file:') });
    } finally {
      await browser.close();
    }
  }
  for (const frame of frames) assertNearestExpansion(frame, captures.get(`${frame}-1`), captures.get(`${frame}-4`), 4);
});
