import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { DateKey } from "@squares/domain/date";
import { exportFilename, parseAppData, serialise } from "@squares/domain/storage";
import type { AppData } from "@squares/domain/types";

/**
 * Handing a file to the device, and taking one back.
 *
 * ADR 0002: the file is the only copy of the year that survives this app's
 * storage being cleared, and ADR 0006 notes that uninstalling an app is
 * precisely that event, arriving with no warning in front of it. So the phone
 * ships Export and Import in v1.
 *
 * The web has to choose between `navigator.share` and an `<a download>` because
 * it does not know which it is running on. A phone has one answer: the OS share
 * sheet, which is where "save to Files" lives.
 *
 * **What `handOff` cannot tell you.** The web's version resolves false when the
 * user backs out of the sheet, because `navigator.share()` rejects on dismissal
 * — and the Screens lean on that, since a caller that reports success there
 * would be telling the user their year is safe somewhere it is not.
 * `expo-sharing`'s `shareAsync` returns `Promise<void>`: it resolves the same
 * way whether the file was saved or the sheet was swiped away. So this returns
 * *"the sheet was presented and closed"* and nothing stronger, and the Screens
 * word their status to claim only that.
 */

/** A cache file, because the copy that matters is the one the sheet takes. */
async function share(name: string, write: (file: File) => void, mimeType: string): Promise<boolean> {
  const file = new File(Paths.cache, name);
  try {
    // A previous export of the same name is still sitting there — the cache is
    // only cleared when the device is short of space.
    if (file.exists) file.delete();
    file.create();
    write(file);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, { mimeType, UTI: mimeType });
    return true;
  } catch {
    return false;
  }
}

export function exportRecord(data: AppData, today: DateKey): Promise<boolean> {
  return share(exportFilename(today), (file) => file.write(serialise(data)), "application/json");
}

/**
 * The Share Card. No date in the filename — the card carries none, and neither
 * should the file it is saved as.
 */
export function exportCard(base64: string): Promise<boolean> {
  return share("squares.png", (file) => file.write(base64ToBytes(base64)), "image/png");
}

export type ImportResult =
  | { kind: "cancelled" }
  | { kind: "unreadable" }
  | { kind: "not-ours" }
  | { kind: "ok"; data: AppData };

/**
 * Pick a file and read it back as a record.
 *
 * No mime-type filter, for the reason the web gives for having no `accept`: a
 * file that has been round-tripped through a share sheet, a messaging app or a
 * cloud folder can come back renamed or untyped, and the picker greys those out
 * with no explanation. `parseAppData` is the real gate, and it says why it
 * refused.
 */
export async function importRecord(): Promise<ImportResult> {
  let text: string;
  try {
    const picked = await File.pickFileAsync();
    if (picked.canceled) return { kind: "cancelled" };
    text = await picked.result.text();
  } catch {
    return { kind: "unreadable" };
  }
  try {
    const parsed = parseAppData(JSON.parse(text));
    return parsed ? { kind: "ok", data: parsed } : { kind: "not-ours" };
  } catch {
    return { kind: "unreadable" };
  }
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Skia hands back a base64 PNG and `File.write` takes bytes, so the string has
 * to be decoded. React Native has no `atob` — it is a browser API, not a
 * JavaScript one — and pulling in a polyfill for one call is more dependency
 * than this is worth.
 */
function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = new Uint8Array((clean.length * 3) / 4 | 0);
  let byte = 0;
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    buffer = (buffer << 6) | ALPHABET.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[byte++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, byte);
}
