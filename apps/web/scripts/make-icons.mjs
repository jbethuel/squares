/**
 * Generate the app icons from the same Intensity ramp the app uses, so the icon
 * cannot drift from the palette. Writes PNGs directly — no image dependency.
 *
 * The ramp is imported rather than restated. This file used to carry its own
 * copy of both the values and the oklch conversion, which made three copies of
 * the ramp in a repo whose test only guarded two of them.
 *
 *   node scripts/make-icons.mts
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CARD, DARK_LEVELS, toRgb } from "@squares/domain/palette";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const BG = toRgb(CARD.bg);
const LEVELS = DARK_LEVELS.map(toRgb);

/** A 4x4 patch of the Heatmap: a week that mostly went well. */
const PATTERN = [
  [2, 4, 3, 0],
  [4, 3, 4, 2],
  [1, 4, 4, 3],
  [3, 2, 4, 4],
];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** `inset` is the fraction of the canvas kept clear for a maskable safe zone. */
function draw(size, inset) {
  const pixels = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);

  const cells = PATTERN.length;
  const field = size * (1 - inset * 2);
  const gap = field * 0.06;
  const cell = (field - gap * (cells - 1)) / cells;
  const radius = cell * 0.22;
  const origin = size * inset;

  for (let row = 0; row < cells; row++) {
    for (let column = 0; column < cells; column++) {
      const colour = LEVELS[PATTERN[row][column]];
      const left = origin + column * (cell + gap);
      const top = origin + row * (cell + gap);
      for (let y = Math.floor(top); y < Math.ceil(top + cell); y++) {
        for (let x = Math.floor(left); x < Math.ceil(left + cell); x++) {
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          // Round the corners so the mark reads as Squares, not as a bar chart.
          const dx = Math.max(left + radius - x, x - (left + cell - radius), 0);
          const dy = Math.max(top + radius - y, y - (top + cell - radius), 0);
          if (dx * dx + dy * dy > radius * radius) continue;
          set(x, y, colour);
        }
      }
    }
  }
  return png(size, pixels);
}

mkdirSync(OUT, { recursive: true });
const icons = [
  ["icon-192.png", 192, 0.14],
  ["icon-512.png", 512, 0.14],
  ["icon-maskable-512.png", 512, 0.22],
  ["apple-touch-icon.png", 180, 0.14],
];
for (const [name, size, inset] of icons) {
  writeFileSync(join(OUT, name), draw(size, inset));
  console.log(`wrote public/${name}`);
}
