import Storage from "expo-sqlite/kv-store";
import { todayKey, type DateKey } from "@squares/domain/date";
import { parseAppData, STORAGE_KEY } from "@squares/domain/storage";
import { emptyData, type AppData } from "@squares/domain/types";

/**
 * The phone's half of ADR 0004's storage layer.
 *
 * `expo-sqlite/kv-store` rather than AsyncStorage, because `StorageAdapter` is
 * synchronous and this is the one Expo store with a synchronous API. That is not
 * an accident of convenience: the store loads the record before first paint and
 * a promise there would mean a frame of nothing on every launch.
 *
 * Validating and migrating the blob is shared — an Export written on the web has
 * to import here, and the reverse — so only the reading and writing lives in
 * this file. Uninstalling the app clears this store, which is exactly the event
 * ADR 0004 promised Export would answer.
 */
export function loadData(today: DateKey = todayKey()): AppData {
  let parsed: AppData | null = null;
  try {
    const blob = Storage.getItemSync(STORAGE_KEY);
    parsed = blob ? parseAppData(JSON.parse(blob)) : null;
  } catch {
    parsed = null;
  }
  return parsed ?? emptyData(today);
}

export function saveData(data: AppData): void {
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A full or blocked store must not take the app down mid-Log. The Log is
    // still in memory; the next write will retry.
  }
}

/** What `StoreProvider` is given, so the rules never name a storage engine. */
export const deviceStorage = { load: loadData, save: saveData };
