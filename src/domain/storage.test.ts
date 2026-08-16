import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit, sealDays, toggleTick } from "./mutations";
import {
  exportFilename,
  loadData,
  parseAppData,
  saveData,
  serialise,
  STORAGE_KEY,
} from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);

/**
 * localStorage is the whole of ADR 0002's storage layer, so the tests own one
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

describe("export", () => {
  it("writes a file that parses back to the same year", () => {
    const data = account(20, ["workout"]);
    expect(parseAppData(JSON.parse(serialise(data)))).toEqual(data);
  });

  it("names the file for the Day it was taken", () => {
    expect(exportFilename(TODAY)).toBe("squares-2026-08-03.json");
  });
});

/**
 * ADR 0005. An Export is the only copy of the record that survives this app's
 * storage being cleared, so a v1 file that cannot be read is a backup that has
 * been destroyed. Refusing one was never an option.
 */
describe("a v1 file is migrated, never refused", () => {
  const v1 = (habits: unknown[]) =>
    parseAppData({ version: 1, installedOn: TODAY, habits, days: {}, theme: "dark" });

  const legacy = (overrides: Record<string, unknown>) => ({
    id: "h1",
    name: "workout",
    createdOn: addDays(TODAY, -20),
    archivedOn: null,
    ...overrides,
  });

  it("turns a live v1 Habit into one open Span", () => {
    expect(v1([legacy({})])?.habits[0]?.spans).toEqual([{ from: addDays(TODAY, -20), to: null }]);
  });

  it("turns an archived v1 Habit into one closed Span", () => {
    expect(v1([legacy({ archivedOn: YESTERDAY })])?.habits[0]?.spans).toEqual([
      { from: addDays(TODAY, -20), to: YESTERDAY },
    ]);
  });

  it("keeps everything else the file said", () => {
    const parsed = v1([legacy({ chained: true, sharedName: true })]);
    expect(parsed?.version).toBe(2);
    expect(parsed?.theme).toBe("dark");
    expect(parsed?.habits[0]).toMatchObject({ chained: true, sharedName: true, name: "workout" });
  });

  it("still refuses a version it has never written", () => {
    expect(parseAppData({ version: 3, installedOn: TODAY, habits: [], days: {} })).toBeNull();
  });
});

describe("import discards anything that does not typecheck", () => {
  const file = (overrides: Record<string, unknown>) =>
    parseAppData({ version: 1, installedOn: TODAY, habits: [], days: {}, theme: "system", ...overrides });

  const habit = (overrides: Record<string, unknown>) => ({
    id: "h1",
    name: "workout",
    createdOn: TODAY,
    archivedOn: null,
    ...overrides,
  });

  it("drops a Habit with no usable name or id", () => {
    expect(file({ habits: [habit({ name: "   " })] })?.habits).toEqual([]);
    expect(file({ habits: [habit({ id: "" })] })?.habits).toEqual([]);
    expect(file({ habits: [habit({ createdOn: "not-a-day" })] })?.habits).toEqual([]);
    expect(file({ habits: ["workout", null, 7] })?.habits).toEqual([]);
  });

  it("drops a Habit whose Archive date is not a Day", () => {
    expect(file({ habits: [habit({ archivedOn: "someday" })] })?.habits).toEqual([]);
    // Absent is legitimate, and means the Habit is live.
    expect(file({ habits: [habit({ archivedOn: undefined })] })?.habits[0]?.spans).toEqual([
      { from: TODAY, to: null },
    ]);
  });

  it("drops a Habit whose Spans are not Days", () => {
    const v2 = (spans: unknown) =>
      file({ version: 2, habits: [{ id: "h1", name: "workout", spans }] })?.habits;
    expect(v2([{ from: "someday", to: null }])).toEqual([]);
    expect(v2([{ from: TODAY, to: "someday" }])).toEqual([]);
    expect(v2([])).toEqual([]);
    expect(v2("nope")).toEqual([]);
  });

  it("trims a name rather than trusting the file's spacing", () => {
    expect(file({ habits: [habit({ name: "  workout  " })] })?.habits[0]?.name).toBe("workout");
  });

  it("treats a non-array habits field as no Habits", () => {
    expect(file({ habits: { h1: "workout" } })?.habits).toEqual([]);
  });

  it("drops a Tick on a Day the file says the Habit was not Active", () => {
    const parsed = file({
      habits: [habit({})],
      days: { [TODAY]: { date: TODAY, active: [], ticked: ["h1"] } },
    });
    // The Day has no Active Habits at all, so it is not a Day Record.
    expect(parsed?.days[TODAY]).toBeUndefined();
  });

  it("keeps the stored Active set as the denominator, whatever the Habits say", () => {
    // ADR 0001: `active` is stored, never re-derived. A file listing two Active
    // Habits on a Day keeps two, even though only one is Ticked.
    const parsed = file({
      habits: [habit({}), habit({ id: "h2", name: "read" })],
      days: { [TODAY]: { date: TODAY, active: ["h1", "h2"], ticked: ["h1"] } },
    });
    expect(parsed?.days[TODAY]).toEqual({ date: TODAY, active: ["h1", "h2"], ticked: ["h1"] });
  });

  it("ignores keys that are not Days and entries that are not records", () => {
    const parsed = file({
      habits: [habit({})],
      days: {
        "not-a-day": { date: "not-a-day", active: ["h1"], ticked: [] },
        [TODAY]: "yesterday I did everything",
        [YESTERDAY]: { date: YESTERDAY, active: ["h1"], ticked: ["h1"] },
      },
    });
    expect(Object.keys(parsed!.days)).toEqual([YESTERDAY]);
  });

  it("falls back to the system theme rather than an unknown one", () => {
    expect(file({ theme: "neon" })?.theme).toBe("system");
    expect(file({ theme: undefined })?.theme).toBe("system");
    expect(file({ theme: "light" })?.theme).toBe("light");
  });

  it("rejects a root that is not an object", () => {
    expect(parseAppData("squares")).toBeNull();
    expect(parseAppData(42)).toBeNull();
    expect(parseAppData(undefined)).toBeNull();
  });
});
