/**
 * Draw the Play Console graphics again. No build uses these — they are uploaded
 * to the listing by hand.
 *
 *   pnpm store-assets
 */
import { STORE_ASSETS } from "../src/artwork.ts";
import { write } from "./write.mts";

write(STORE_ASSETS);
