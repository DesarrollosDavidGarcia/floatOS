// Genera los íconos PWA de FlotaOS como PNG sin dependencias externas.
// Dibuja un cuadrado (con esquinas redondeadas opcionales) en color de marca
// con una "F" como placeholder. Reemplaza por el arte final cuando lo tengas.
//
// Uso:  node scripts/generate-pwa-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');

// --- Colores de marca (de globals.css: --primary 222.2 47.4% 11.2%) ---
const BG = [15, 23, 42, 255]; // #0f172a slate-900
const FG = [248, 250, 252, 255]; // #f8fafc

// --- CRC32 para chunks PNG ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression, filter, interlace = 0
  // scanlines con filtro 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
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

// --- Dibujo ---
function makeIcon(size, { rounded }) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = rounded ? size * 0.22 : 0;

  // glifo "F" centrado, con padding (más aire en versión maskable / full-bleed)
  const pad = rounded ? 0.28 : 0.34;
  const gx0 = size * pad;
  const gx1 = size * (1 - pad);
  const gy0 = size * pad;
  const gy1 = size * (1 - pad);
  const gw = gx1 - gx0;
  const gh = gy1 - gy0;
  const stemW = gw * 0.24;
  const topH = gh * 0.22;
  const midY0 = gy0 + gh * 0.42;
  const midY1 = midY0 + gh * 0.22;
  const midW = gw * 0.74;

  const inRoundedRect = (x, y) => {
    if (radius <= 0) return true;
    const rx = Math.min(x, size - 1 - x);
    const ry = Math.min(y, size - 1 - y);
    if (rx >= radius || ry >= radius) return true;
    const dx = radius - rx;
    const dy = radius - ry;
    return dx * dx + dy * dy <= radius * radius;
  };
  const inF = (x, y) => {
    const stem = x >= gx0 && x <= gx0 + stemW && y >= gy0 && y <= gy1;
    const top = y >= gy0 && y <= gy0 + topH && x >= gx0 && x <= gx1;
    const mid = y >= midY0 && y <= midY1 && x >= gx0 && x <= gx0 + midW;
    return stem || top || mid;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!inRoundedRect(cx, cy)) {
        rgba[i] = 0; rgba[i + 1] = 0; rgba[i + 2] = 0; rgba[i + 3] = 0; // transparente
        continue;
      }
      const [r, g, b, a] = inF(cx, cy) ? FG : BG;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
    }
  }
  return encodePNG(size, size, rgba);
}

// --- Salidas ---
const iconsDir = join(WEB_ROOT, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const outputs = [
  { file: join(iconsDir, 'icon-192.png'), size: 192, rounded: true },
  { file: join(iconsDir, 'icon-512.png'), size: 512, rounded: true },
  { file: join(iconsDir, 'icon-maskable-512.png'), size: 512, rounded: false },
  { file: join(iconsDir, 'apple-touch-icon.png'), size: 180, rounded: false },
  // favicon que Next.js sirve automáticamente desde src/app/icon.png
  { file: join(WEB_ROOT, 'src', 'app', 'icon.png'), size: 64, rounded: true },
];

for (const { file, size, rounded } of outputs) {
  writeFileSync(file, makeIcon(size, { rounded }));
  console.log('✓', file.replace(WEB_ROOT, '.'), `(${size}px)`);
}
console.log('\nÍconos PWA generados.');
