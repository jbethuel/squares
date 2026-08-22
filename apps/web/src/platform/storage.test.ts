import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, type DateKey } from "@squares/domain/date";
import { addHabit, sealDays, toggleTick } from "@squares/domain/mutations";
import { STORAGE_KEY } from "@squares/domain/storage";
import { emptyData, type AppData } from "@squares/domain/types";
import { loadData, saveData } from "./storage";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);

/**
 * localStorage is the whole of ADR 0004's storage layer, so the tests own one
 * rather than borrowing a DOM: a Map that can also be made to fail on demand.
 */
function fakeStorage() {
  const entries = new Map<string, string>();
  let failWrites = false;
  return {
    store: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new DOMException("quota", "QuotaExceededError");
        entries.set(key, value);
      },
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage,
    entries,
    breakWrites: () => {
      failWrites = true;
    },
  };
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("localStorage", storage.store);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = sealDays(emptyData(installedOn), TODAY);
  for (const name of names) data = addHabit(data, name, installedOn);
  return sealDays(data, TODAY);
}

describe("loading what is on the device", () => {
  it("starts a fresh year when the device is empty", () => {
    const data = loadData(TODAY);
    expect(data.installedOn).toBe(TODAY);
    expect(data.habits).toEqual([]);
    expect(data.theme).toBe("system");
  });

  it("round-trips a saved year", () => {
    const saved = account(20, ["workout", "read"]);
    saveData(saved);
    expect(loadData(TODAY)).toEqual(saved);
  });

  it("survives a corrupt blob rather than taking the app down", () => {
    storage.entries.set(STORAGE_KEY, "{ not json");
    expect(loadData(TODAY).habits).toEqual([]);
  });

  it("survives a blob that parses but is not a Squares export", () => {
    storage.entries.set(STORAGE_KEY, JSON.stringify({ version: 99, habits: ["hi"] }));
    expect(loadData(TODAY).installedOn).toBe(TODAY);
  });

  it("seals the Days that elapsed while the app was closed", () => {
    // Saved a week ago, opened today: every Day in between gets a record, and
    // each one is closed with nothing Ticked.
    const stale = account(1, ["workout"]);
    saveData(stale);
    const reopened = loadData(addDays(TODAY, 7));
    expect(Object.keys(reopened.days)).toHaveLength(8);
    expect(Object.values(reopened.days).every((d) => d.active.length === 1)).toBe(true);
    expect(Object.values(reopened.days).every((d) => d.ticked.length === 0)).toBe(true);
  });

  it("does not rewrite a Tick that was recorded before the app was closed", () => {
    let data = account(10, ["workout"]);
    const workout = data.habits[0]!.id;
    data = toggleTick(data, workout, YESTERDAY, TODAY);
    saveData(data);
    // Two Days later, yesterday's Tick is outside the Grace Window and frozen.
    const reopened = loadData(addDays(TODAY, 2));
    expect(reopened.days[YESTERDAY]?.ticked).toEqual([workout]);
  });

  it("falls back to an empty year where there is no localStorage at all", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => loadData(TODAY)).not.toThrow();
    expect(loadData(TODAY).habits).toEqual([]);
  });
});

describe("saving", () => {
  it("does not take the app down when the store is full", () => {
    const data = account(5, ["workout"]);
    storage.breakWrites();
    // The Tick is still in memory; the next write will retry. A thrown quota
    // error here would lose the tap the user just made.
    expect(() => saveData(data)).not.toThrow();
  });

  it("is a no-op where there is no localStorage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveData(account(5, ["workout"]))).not.toThrow();
  });
});
