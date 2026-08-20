/**
 * Write `src/app/tokens.css` from the ramp in `@squares/domain/palette`.
 *
 *   node scripts/generate-tokens.mts   (or `pnpm tokens`)
 *
 * The rendering itself lives in `src/app/tokens.ts`, so the test can call it
 * without going through a script that writes files.
 *
 * `pnpm tokens` silences MODULE_TYPELESS_PACKAGE_JSON: node strips the types out
 * of that import and warns that it had to detect the module kind, because this
 * app is not `"type": "module"` and cannot become one without moving Next's
 * whole config over with it.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tokensCss } from "../src/app/tokens.ts";

const out = fileURLToPath(new URL("../src/app/tokens.css", import.meta.url));
writeFileSync(out, tokensCss());
console.log(`wrote ${out}`);
