import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  table[n] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function render(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = (y * size + x) * 4;
    rgba[index] = color[0];
    rgba[index + 1] = color[1];
    rgba[index + 2] = color[2];
    rgba[index + 3] = color[3] ?? 255;
  };
  const rect = (x, y, width, height, color) => {
    for (let py = Math.floor(y * scale); py < Math.ceil((y + height) * scale); py += 1) {
      for (let px = Math.floor(x * scale); px < Math.ceil((x + width) * scale); px += 1) setPixel(px, py, color);
    }
  };
  const rounded = (x, y, width, height, radius, color) => {
    const left = x * scale, top = y * scale, right = (x + width) * scale, bottom = (y + height) * scale;
    const r = radius * scale;
    for (let py = Math.floor(top); py < Math.ceil(bottom); py += 1) {
      for (let px = Math.floor(left); px < Math.ceil(right); px += 1) {
        const cx = Math.max(left + r, Math.min(px + 0.5, right - r));
        const cy = Math.max(top + r, Math.min(py + 0.5, bottom - r));
        if ((px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2 <= r ** 2) setPixel(px, py, color);
      }
    }
  };

  const background = [11, 16, 23, 255];
  const accent = [255, 122, 26, 255];
  const text = [238, 244, 248, 184];
  if (maskable) rect(0, 0, 512, 512, background);
  else rounded(0, 0, 512, 512, 96, background);
  rect(102, 78, 308, 18, text);
  rect(102, 416, 308, 18, text);
  rect(104, 106, 78, 300, accent);
  rect(182, 106, 58, 66, accent);
  rect(182, 340, 58, 66, accent);
  rounded(210, 106, 198, 300, 96, accent);
  rounded(210, 172, 120, 168, 52, background);
  rect(182, 172, 88, 168, background);

  const stride = size * 4 + 1;
  const scanlines = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) rgba.copy(scanlines, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(root, { recursive: true });
writeFileSync(resolve(root, 'pwa-192.png'), render(192));
writeFileSync(resolve(root, 'pwa-512.png'), render(512));
writeFileSync(resolve(root, 'pwa-maskable-512.png'), render(512, true));
