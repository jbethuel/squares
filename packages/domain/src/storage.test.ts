import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit } from "./mutations";
import { exportFilename, parseAppData, serialise } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = emptyData(installedOn);
  for (const name of names) data = addHabit(data, name, installedOn);
  return data;
}

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
 * ADR 0003. An Export is the only copy of the record that survives this app's
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

  it("turns an hidden v1 Habit into one closed Span", () => {
    expect(v1([legacy({ archivedOn: YESTERDAY })])?.habits[0]?.spans).toEqual([
      { from: addDays(TODAY, -20), to: YESTERDAY },
    ]);
  });

  it("keeps everything else the file said", () => {
    const parsed = v1([legacy({ chained: true, sharedName: true })]);
    expect(parsed?.version).toBe(3);
    expect(parsed?.theme).toBe("dark");
    expect(parsed?.habits[0]).toMatchObject({ streaks: true, sharedName: true, name: "workout" });
  });

  it("still refuses a version it has never written", () => {
    expect(parseAppData({ version: 4, installedOn: TODAY, habits: [], days: {} })).toBeNull();
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

  it("drops a Habit whose hidden-on date is not a Day", () => {
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

  it("keeps a Log even where the file's discarded Active set disagreed", () => {
    // ADR 0001: `active` is not migrated. The Log is the only thing on the Day
    // that still means something, and the denominator comes from Spans now.
    const parsed = file({
      habits: [habit({})],
      days: { [TODAY]: { date: TODAY, active: [], logged: ["h1"] } },
    });
    expect(parsed?.days[TODAY]).toEqual({ date: TODAY, logged: ["h1"] });
  });

  it("discards the stored Active set and keeps only the Logs", () => {
    const parsed = file({
      habits: [habit({}), habit({ id: "h2", name: "read" })],
      days: { [TODAY]: { date: TODAY, active: ["h1", "h2"], logged: ["h1"] } },
    });
    expect(parsed?.days[TODAY]).toEqual({ date: TODAY, logged: ["h1"] });
  });

  it("drops a Day that carries no Logs", () => {
    const parsed = file({
      habits: [habit({})],
      days: { [TODAY]: { date: TODAY, active: ["h1"], logged: [] } },
    });
    expect(parsed?.days[TODAY]).toBeUndefined();
  });

  it("ignores keys that are not Days and entries that are not records", () => {
    const parsed = file({
      habits: [habit({})],
      days: {
        "not-a-day": { date: "not-a-day", active: ["h1"], logged: ["h1"] },
        [TODAY]: "yesterday I did everything",
        [YESTERDAY]: { date: YESTERDAY, active: ["h1"], logged: ["h1"] },
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
