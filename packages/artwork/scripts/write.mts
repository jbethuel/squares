import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "../src/png.ts";
import type { Art } from "../src/artwork.ts";

/** The repository root, three levels up from `packages/artwork/scripts`. */
const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

/**
 * Draw each file and write it, saying which ones actually moved.
 *
 * Unchanged files are left alone rather than rewritten with identical bytes.
 * Both of these scripts write into directories the apps build from, and a
 * timestamp that moves on every run is a diff that says nothing.
 */
export function write(art: readonly Art[]): void {
  let changed = 0;
  for (const piece of art) {
    const out = resolve(ROOT, piece.path);
    const { width, height, data } = piece.draw();
    const png = encodePng(width, height, data);

    let before: Uint8Array | null = null;
    try {
      before = readFileSync(out);
    } catch {
      // A new file. Nothing to compare against.
    }
    if (before && before.length === png.length && before.every((byte, i) => byte === png[i])) {
      console.log(`  same  ${piece.path}`);
      continue;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, png);
    console.log(`${before ? " redrew" : "    new"}  ${piece.path}`);
    changed++;
  }
  console.log(changed === 0 ? "\nnothing moved." : `\n${changed} file(s) written.`);
}
