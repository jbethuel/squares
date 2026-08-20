import { todayKey, type DateKey } from "@squares/domain/date";
import { sealDays } from "@squares/domain/mutations";
import { parseAppData, STORAGE_KEY } from "@squares/domain/storage";
import { emptyData, type AppData } from "@squares/domain/types";

/**
 * The web's half of ADR 0002's storage layer: localStorage, and nothing else.
 *
 * Validating and migrating the blob is shared (`@squares/domain/storage`)
 * because an Export written on one platform has to import on the other. Getting
 * the bytes on and off the device is not, which is why this file exists rather
 * than a branch inside the shared one.
 */
export function loadData(today: DateKey = todayKey()): AppData {
  if (typeof localStorage === "undefined") return emptyData(today);
  let parsed: AppData | null = null;
  try {
    const blob = localStorage.getItem(STORAGE_KEY);
    parsed = blob ? parseAppData(JSON.parse(blob)) : null;
  } catch {
    parsed = null;
  }
  return sealDays(parsed ?? emptyData(today), today);
}

export function saveData(data: AppData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A full or blocked store must not take the app down mid-Tick. The Tick is
    // still in memory; the next write will retry.
  }
}

/** What `StoreProvider` is given, so the rules never name a storage engine. */
export const webStorage = { load: loadData, save: saveData };
