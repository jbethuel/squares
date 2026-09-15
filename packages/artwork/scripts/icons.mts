/**
 * Draw the icons of both apps again from the Intensity ramp.
 *
 *   pnpm icons
 *
 * The drawing lives in `src/artwork.ts` so the tests can call it without going
 * through a script that writes files — the same split `pnpm tokens` uses.
 */
import { ICONS } from "../src/artwork.ts";
import { write } from "./write.mts";

write(ICONS);
