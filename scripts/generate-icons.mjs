/**
 * Generates the extension's PNG icons without any image dependencies.
 * Draws a rounded-square violet→magenta gradient with a minimal aperture
 * ring mark, then encodes RGBA pixels to PNG using Node's built-in zlib.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/icons');
mkdirSync(OUT, { recursive: true });

const SIZES = [16, 32, 48, 128];

// Brand gradient stops (violet -> magenta), sRGB.
const C1 = [124, 58, 237]; // #7C3AEDapprox
const C2 = [217, 70, 160]; // magenta

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (t) => [
  Math.round(lerp(C1[0], C2[0], t)),
  Math.round(lerp(C1[1], C2[1], t)),
  Math.round(lerp(C1[2], C2[2], t)),
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rest zero (compression/filter/interlace)
  // Add filter byte (0) per row.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const r = size * 0.22; // corner radius
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.34;
  const inner = size * 0.17;
  const thickness = size * 0.085;

  const inRounded = (x, y) => {
    const dx = Math.min(x, size - 1 - x);
    const dy = Math.min(y, size - 1 - y);
    if (dx >= r && dy >= r) return true;
    if (dx >= r || dy >= r) return dx >= 0 && dy >= 0;
    const ddx = r - dx;
    const ddy = r - dy;
    return ddx * ddx + ddy * ddy <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRounded(x, y)) {
        buf[i + 3] = 0;
        continue;
      }
      // Diagonal gradient background.
      const t = (x + y) / (2 * size);
      let [rr, gg, bb] = mix(t);

      // Aperture ring mark (white, semi-opaque).
      const dist = Math.hypot(x - cx, y - cy);
      const ring =
        dist <= outer && dist >= outer - thickness ? 1 : 0;
      const dot = dist <= inner ? 1 : 0;
      if (ring || dot) {
        rr = 255;
        gg = 255;
        bb = 255;
      }
      buf[i] = rr;
      buf[i + 1] = gg;
      buf[i + 2] = bb;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

for (const size of SIZES) {
  const png = encodePng(size, drawIcon(size));
  writeFileSync(resolve(OUT, `icon-${size}.png`), png);
  console.log(`  ✓ icon-${size}.png (${png.length} bytes)`);
}
console.log('Icons generated.');
