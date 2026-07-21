const assert = require('node:assert/strict');
const zlib = require('node:zlib');

function paeth(a, b, c) {
  const prediction = a + b - c;
  const pa = Math.abs(prediction - a); const pb = Math.abs(prediction - b); const pc = Math.abs(prediction - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'invalid PNG signature');
  let offset = 8; let width; let height; let colorType; let palette; let transparency;
  const dataChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset); const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length); offset += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; assert.equal(data[8], 8); }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') dataChunks.push(data);
    else if (type === 'IEND') break;
  }
  const channels = { 2: 3, 3: 1, 6: 4 }[colorType];
  assert.ok(channels, `unsupported PNG color type ${colorType}`);
  const compressed = zlib.inflateSync(Buffer.concat(dataChunks));
  const stride = width * channels; const raw = Buffer.alloc(stride * height);
  for (let y = 0, source = 0; y < height; y += 1) {
    const filter = compressed[source++];
    for (let x = 0; x < stride; x += 1) {
      const byte = compressed[source++];
      const left = x >= channels ? raw[y * stride + x - channels] : 0;
      const up = y ? raw[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= channels ? raw[(y - 1) * stride + x - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up
        : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : NaN;
      assert.ok(Number.isFinite(predictor), `unsupported PNG filter ${filter}`);
      raw[y * stride + x] = (byte + predictor) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    if (colorType === 6) raw.copy(pixels, index * 4, index * 4, index * 4 + 4);
    else if (colorType === 2) {
      pixels[index * 4] = raw[index * 3]; pixels[index * 4 + 1] = raw[index * 3 + 1];
      pixels[index * 4 + 2] = raw[index * 3 + 2]; pixels[index * 4 + 3] = 255;
    } else {
      const paletteIndex = raw[index];
      pixels[index * 4] = palette[paletteIndex * 3]; pixels[index * 4 + 1] = palette[paletteIndex * 3 + 1];
      pixels[index * 4 + 2] = palette[paletteIndex * 3 + 2]; pixels[index * 4 + 3] = transparency?.[paletteIndex] ?? 255;
    }
  }
  return { width, height, pixels };
}

module.exports = { decodePng };
