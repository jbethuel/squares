import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit, setHidden, setStreaks, toggleLog } from "./mutations";
import {
  activeOn,
  countedOn,
  elapsedDays,
  hiddenHabits,
  intensityAt,
  isToday,
  logCountOf,
  longestStreakOf,
  streakOf,
  totalLogs,
  visibleHabits,
} from "./selectors";
import { parseAppData } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);
const CLOSED = addDays(TODAY, -2);
const LATER = addDays(TODAY, 1);

/** An account installed `age` Days ago with `names` Habits, all taken up then. */
function account(age: number, names: string[], today: DateKey = TODAY): AppData {
  const installedOn = addDays(today, -(age - 1));
  let data = emptyData(installedOn);
  for (const name of names) {
    data = addHabit(data, name, installedOn);
  }
  return data;
}

function idOf(data: AppData, name: string): string {
  const habit = data.habits.find((h) => h.name === name);
  if (!habit) throw new Error(`no habit named ${name}`);
  return habit.id;
}

/** Write Logs straight into the record, past ADR 0002, to build history. */
function seed(data: AppData, habitId: string, offsets: number[], today = TODAY): AppData {
  const days = { ...data.days };
  for (const offset of offsets) {
    const date = addDays(today, -offset);
    const logged = days[date]?.logged ?? [];
    if (!logged.includes(habitId)) days[date] = { date, logged: [...logged, habitId] };
  }
  return { ...data, days };
}

describe("a Log lands on today or nowhere (ADR 0002)", () => {
  it("opens today and nothing else", () => {
    expect(isToday(TODAY, TODAY)).toBe(true);
    expect(isToday(YESTERDAY, TODAY)).toBe(false);
    expect(isToday(CLOSED, TODAY)).toBe(false);
    expect(isToday(LATER, TODAY)).toBe(false);
  });

  it("refuses yesterday — there is no window back into it", () => {
    const data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    expect(toggleLog(data, workout, YESTERDAY, TODAY)).toBe(data);
    expect(data.days[YESTERDAY]).toBeUndefined();
  });

  it("refuses a closed Day and the future alike", () => {
    const data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    expect(toggleLog(data, workout, CLOSED, TODAY)).toBe(data);
    expect(toggleLog(data, workout, LATER, TODAY)).toBe(data);
  });

  it("accepts a Log on today", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    expect(data.days[TODAY]?.logged).toEqual([workout]);
  });

  it("un-logs today, because today is not yet a record", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    data = toggleLog(data, workout, TODAY, TODAY);
    expect(data.days[TODAY]).toBeUndefined();
  });

  it("keeps no record for a Day with no Logs", () => {
    const data = account(30, ["workout"]);
    expect(Object.keys(data.days)).toHaveLength(0);
  });

  it("refuses a Log for a Habit that is not Active today", () => {
    let data = account(5, ["workout"]);
    const workout = idOf(data, "workout");
    data = setHidden(data, workout, true, TODAY);
    expect(toggleLog(data, workout, TODAY, TODAY)).toBe(data);
  });
});

describe("the Overview is a live projection over visible Habits (ADR 0001)", () => {
  it("counts a Habit only if it was Active that Day and is visible now", () => {
    let data = account(5, ["workout"]);
    data = addHabit(data, "read", TODAY);
    const workout = idOf(data, "workout");
    const read = idOf(data, "read");
    expect(countedOn(data, TODAY, TODAY)).toEqual([workout, read]);
    expect(countedOn(data, YESTERDAY, TODAY)).toEqual([workout]);
  });

  it("does not darken the year behind a Habit taken up today", () => {
    let data = account(5, ["workout"]);
    data = seed(data, idOf(data, "workout"), [2]);
    expect(intensityAt(data, CLOSED, TODAY)).toBe(4);
    data = addHabit(data, "read", TODAY);
    expect(intensityAt(data, CLOSED, TODAY)).toBe(4);
    expect(activeOn(data.habits, CLOSED)).toHaveLength(1);
  });

  it("re-shades the past when a Habit is Hidden", () => {
    let data = account(5, ["workout", "read"]);
    data = seed(data, idOf(data, "workout"), [2]);
    expect(intensityAt(data, CLOSED, TODAY)).toBe(2); // one of two

    data = setHidden(data, idOf(data, "read"), true, TODAY);
    expect(intensityAt(data, CLOSED, TODAY)).toBe(4); // one of one
  });

  it("gives the past back when the Habit comes back", () => {
    let data = account(5, ["workout", "read"]);
    data = seed(data, idOf(data, "workout"), [2]);
    data = setHidden(data, idOf(data, "read"), true, TODAY);
    data = setHidden(data, idOf(data, "read"), false, LATER);
    expect(intensityAt(data, CLOSED, LATER)).toBe(2);
  });

  it("leaves a permanent gap for the Days a Habit spent Hidden", () => {
    let data = account(5, ["workout", "read"]);
    data = setHidden(data, idOf(data, "read"), true, TODAY);
    data = setHidden(data, idOf(data, "read"), false, LATER);
    expect(countedOn(data, TODAY, LATER)).toEqual([idOf(data, "workout")]);
    expect(countedOn(data, LATER, LATER)).toHaveLength(2);
  });

  it("takes today's Square down with it when a Logged Habit is Hidden", () => {
    let data = account(5, ["workout", "read"]);
    data = toggleLog(data, idOf(data, "read"), TODAY, TODAY);
    expect(intensityAt(data, TODAY, TODAY)).toBe(2);
    data = setHidden(data, idOf(data, "read"), true, TODAY);
    expect(intensityAt(data, TODAY, TODAY)).toBe(0);
  });

  it("hides rather than deletes — the Logs are all still there", () => {
    let data = account(30, ["a"]);
    const a = idOf(data, "a");
    data = seed(data, a, [3, 4, 5]);
    data = setHidden(data, a, true, TODAY);
    expect(data.habits).toHaveLength(1);
    expect(visibleHabits(data, TODAY)).toEqual([]);
    expect(hiddenHabits(data, TODAY)).toHaveLength(1);
    expect(logCountOf(data, a, TODAY)).toBe(3);
  });
});

describe("Intensity", () => {
  it("is the proportion of that Day's counted Habits, in quartiles", () => {
    const base = account(5, ["a", "b", "c", "d"]);
    const ids = base.habits.map((h) => h.id);
    const level = (n: number) => {
      let data = base;
      for (const id of ids.slice(0, n)) data = seed(data, id, [2]);
      return intensityAt(data, CLOSED, TODAY);
    };
    expect(level(0)).toBe(0);
    expect(level(1)).toBe(1);
    expect(level(2)).toBe(2);
    expect(level(3)).toBe(3);
    expect(level(4)).toBe(4);
  });

  it("stays four levels at any Habit count, so full shade always means a complete Day", () => {
    for (const count of [1, 2, 3, 5, 7]) {
      const names = Array.from({ length: count }, (_, i) => `h${i}`);
      let data = account(5, names);
      for (const habit of data.habits) data = seed(data, habit.id, [2]);
      expect(intensityAt(data, CLOSED, TODAY)).toBe(4);
    }
  });

  it("is 0 on a Day with no counted Habits", () => {
    const data = account(5, []);
    expect(intensityAt(data, CLOSED, TODAY)).toBe(0);
  });
});

describe("Streaks", () => {
  it("counts strictly consecutive Days back from today", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [0, 1, 2, 3]);
    expect(streakOf(data, workout, TODAY)).toBe(4);
  });

  it("does not report a Streak broken at 00:01", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [1, 2, 3]);
    expect(streakOf(data, workout, TODAY)).toBe(3);
  });

  it("is never forgiven or repaired by a single missed Day", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [1, 3, 4, 5, 6]);
    expect(streakOf(data, workout, TODAY)).toBe(1);
    data = account(20, ["workout"]);
    data = seed(data, idOf(data, "workout"), [3, 4, 5, 6]);
    expect(streakOf(data, idOf(data, "workout"), TODAY)).toBe(0);
  });

  it("remembers the Longest Streak after the Streak breaks", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [0, 1, 5, 6, 7, 8, 9]);
    expect(streakOf(data, workout, TODAY)).toBe(2);
    expect(longestStreakOf(data, workout, TODAY)).toBe(5);
  });

  it("belongs to a single Habit — there is no Streak across Habits", () => {
    let data = account(20, ["a", "b"]);
    const a = idOf(data, "a");
    const b = idOf(data, "b");
    data = seed(data, a, [0, 1]);
    data = seed(data, b, [2, 3]);
    expect(streakOf(data, a, TODAY)).toBe(2);
    expect(streakOf(data, b, TODAY)).toBe(0);
  });

  it("is off by default, and turning it on changes nothing but the display", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    expect(data.habits[0]!.streaks).toBe(false);
    data = seed(data, workout, [0, 1, 2]);
    const before = totalLogs(data, TODAY);
    expect(streakOf(data, workout, TODAY)).toBe(3);
    data = setStreaks(data, workout, true);
    expect(totalLogs(data, TODAY)).toBe(before);
    expect(streakOf(data, workout, TODAY)).toBe(3);
  });
});

describe("the Total", () => {
  it("counts every Log across the visible Habits in the last year", () => {
    let data = account(30, ["a", "b"]);
    data = seed(data, idOf(data, "a"), [0, 1, 2]);
    data = seed(data, idOf(data, "b"), [0, 4]);
    expect(totalLogs(data, TODAY)).toBe(5);
    expect(logCountOf(data, idOf(data, "a"), TODAY)).toBe(3);
  });

  it("does not reset on a schedule — a broken Streak never touches it", () => {
    let data = account(30, ["a"]);
    const a = idOf(data, "a");
    data = seed(data, a, [5, 6, 7]);
    const afterStreak = totalLogs(data, TODAY);
    data = seed(data, a, [0]); // a new, unrelated Log after a long gap
    expect(streakOf(data, a, TODAY)).toBe(1);
    expect(totalLogs(data, TODAY)).toBe(afterStreak + 1);
  });

  it("falls when a Habit is Hidden, so it agrees with the Squares below it", () => {
    let data = account(30, ["a", "b"]);
    data = seed(data, idOf(data, "a"), [3, 4, 5]);
    data = seed(data, idOf(data, "b"), [3]);
    expect(totalLogs(data, TODAY)).toBe(4);
    data = setHidden(data, idOf(data, "b"), true, TODAY);
    expect(totalLogs(data, TODAY)).toBe(3);
  });

  it("rises again when the Habit comes back", () => {
    let data = account(30, ["a", "b"]);
    data = seed(data, idOf(data, "b"), [3, 4]);
    data = setHidden(data, idOf(data, "b"), true, TODAY);
    expect(totalLogs(data, TODAY)).toBe(0);
    data = setHidden(data, idOf(data, "b"), false, LATER);
    expect(totalLogs(data, LATER)).toBe(2);
  });
});

describe("the elapsed window", () => {
  it("is one Day on day one and never more than a year", () => {
    expect(elapsedDays(emptyData(TODAY), TODAY)).toBe(1);
    expect(elapsedDays(emptyData(addDays(TODAY, -10)), TODAY)).toBe(11);
    expect(elapsedDays(emptyData(addDays(TODAY, -900)), TODAY)).toBe(365);
  });
});

describe("import", () => {
  it("round-trips an exported file", () => {
    let data = account(20, ["workout", "read"]);
    data = seed(data, idOf(data, "workout"), [0, 1, 2]);
    const parsed = parseAppData(JSON.parse(JSON.stringify(data)));
    expect(parsed).toEqual(data);
  });

  it("rejects a file that is not a Squares export", () => {
    expect(parseAppData(null)).toBeNull();
    expect(parseAppData([])).toBeNull();
    // v1, v2 and v3 are read; a version this app has never written is refused.
    expect(parseAppData({ version: 4, installedOn: TODAY })).toBeNull();
    expect(parseAppData({ version: 1 })).toBeNull();
    expect(parseAppData({ version: 3 })).toBeNull();
    expect(parseAppData({ version: 1, installedOn: "yesterday" })).toBeNull();
  });

  it("migrates a v1 file: one Span, logged becomes logged, active is discarded", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: CLOSED,
      habits: [{ id: "h1", name: "workout", createdOn: CLOSED, archivedOn: null }],
      days: { [CLOSED]: { date: CLOSED, active: ["h1"], logged: ["h1"] } },
      theme: "system",
    });
    expect(parsed?.version).toBe(3);
    expect(parsed?.habits[0]?.spans).toEqual([{ from: CLOSED, to: null }]);
    expect(parsed?.days[CLOSED]).toEqual({ date: CLOSED, logged: ["h1"] });
  });

  it("migrates a v2 chained Habit into a Streak Habit", () => {
    const parsed = parseAppData({
      version: 2,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "workout", spans: [{ from: TODAY, to: null }], chained: true }],
      days: {},
      theme: "system",
    });
    expect(parsed?.habits[0]?.streaks).toBe(true);
  });

  it("discards Logs that reference a Habit the file does not contain", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "workout", createdOn: TODAY, archivedOn: null }],
      days: { [TODAY]: { date: TODAY, active: ["h1", "ghost"], logged: ["h1", "ghost"] } },
      theme: "system",
    });
    expect(parsed?.days[TODAY]).toEqual({ date: TODAY, logged: ["h1"] });
  });

  it("drops a Day that carries no Logs at all", () => {
    const parsed = parseAppData({
      version: 2,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "workout", spans: [{ from: TODAY, to: null }] }],
      days: { [TODAY]: { date: TODAY, active: ["h1"], logged: [] } },
      theme: "system",
    });
    expect(parsed?.days[TODAY]).toBeUndefined();
  });

  it("defaults the opt-ins off, so an old file cannot leak a name", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "took my meds", createdOn: TODAY, archivedOn: null }],
      days: {},
      theme: "system",
    });
    expect(parsed?.habits[0]?.sharedName).toBe(false);
    expect(parsed?.habits[0]?.streaks).toBe(false);
  });
});
