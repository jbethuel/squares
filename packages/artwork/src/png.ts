import { deflateSync } from "node:zlib";

/**
 * A PNG encoder, in about eighty lines.
 *
 * The alternative was a dependency. `sharp` is the obvious one and this
 * workspace already denies its build script (`pnpm-workspace.yaml`), which
 * would have to be reversed to pull in a whole image pipeline for what these
 * files actually are: flat fills and rounded corners, drawn once, by hand.
 *
 * Deterministic on purpose. The same input gives the same bytes, so running
 * `pnpm icons` on an unchanged ramp leaves the working tree clean and a diff on
 * an icon means the ramp moved.
 */

/** The CRC-32 table PNG chunks are checked with. Built once, on first use. */
let table: Uint32Array | null = null;

function crcTable(): Uint32Array {
  if (table) return table;
  const next = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    next[n] = c >>> 0;
  }
  table = next;
  return next;
}

function crc32(bytes: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (const byte of bytes) c = t[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/**
 * Encode 8-bit RGBA pixels as a PNG.
 *
 * Every scanline is written with filter 0 — none. A filter would compress
 * better on a photograph; these are flat fields of four or five colours, where
 * deflate already finds the runs and a filter mostly gets in its way.
 */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) {
    throw new Error(`expected ${width * height * 4} bytes of RGBA, got ${rgba.length}`);
  }

  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  // 10, 11, 12 stay zero: deflate, the only filter method, no interlace.

  // Level 9 because these are written once and read forever, and the result has
  // to be identical run to run — zlib's output is stable for a fixed level.
  const idat = deflateSync(raw, { level: 9 });

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    png.set(part, at);
    at += part.length;
  }
  return png;
}
