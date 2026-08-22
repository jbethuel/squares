import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import {
  addHabit,
  setArchived,
  sealDays,
  setChained,
  toggleTick,
} from "./mutations";
import {
  activeOn,
  chainOf,
  elapsedDays,
  intensityAt,
  isOpen,
  liveHabits,
  longestChainOf,
  stillOpenYesterday,
  tickCountOf,
  totalTicks,
} from "./selectors";
import { parseAppData } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);
const CLOSED = addDays(TODAY, -2);

/** An account installed `age` Days ago with `names` Habits, all created then. */
function account(age: number, names: string[], today: DateKey = TODAY): AppData {
  const installedOn = addDays(today, -(age - 1));
  let data = sealDays(emptyData(installedOn), today);
  for (const name of names) {
    data = addHabit(data, name, installedOn);
  }
  return sealDays(data, today);
}

function idOf(data: AppData, name: string): string {
  const habit = data.habits.find((h) => h.name === name);
  if (!habit) throw new Error(`no habit named ${name}`);
  return habit.id;
}

/** Tick directly into the record, bypassing the Grace Window, to build history. */
function seed(data: AppData, habitId: string, offsets: number[], today = TODAY): AppData {
  const days = { ...data.days };
  for (const offset of offsets) {
    const date = addDays(today, -offset);
    const record = days[date];
    if (!record) throw new Error(`no record for ${date}`);
    if (!record.ticked.includes(habitId)) {
      days[date] = { ...record, ticked: [...record.ticked, habitId] };
    }
  }
  return { ...data, days };
}

describe("the Grace Window", () => {
  it("leaves today and yesterday open, and the Day before closed permanently", () => {
    expect(isOpen(TODAY, TODAY)).toBe(true);
    expect(isOpen(YESTERDAY, TODAY)).toBe(true);
    expect(isOpen(CLOSED, TODAY)).toBe(false);
  });

  it("does not open the future", () => {
    expect(isOpen(addDays(TODAY, 1), TODAY)).toBe(false);
  });

  it("refuses a Tick on a closed Day", () => {
    const data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    expect(toggleTick(data, workout, CLOSED, TODAY)).toBe(data);
    expect(data.days[CLOSED]?.ticked).toEqual([]);
  });

  it("accepts a Tick on today and on yesterday", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleTick(data, workout, TODAY, TODAY);
    data = toggleTick(data, workout, YESTERDAY, TODAY);
    expect(data.days[TODAY]?.ticked).toEqual([workout]);
    expect(data.days[YESTERDAY]?.ticked).toEqual([workout]);
  });

  it("unticks, because a Tick is binary and a mistake must be correctable", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleTick(data, workout, TODAY, TODAY);
    data = toggleTick(data, workout, TODAY, TODAY);
    expect(data.days[TODAY]?.ticked).toEqual([]);
  });

  it("lists the Habits yesterday is still open for", () => {
    let data = account(10, ["workout", "read"]);
    const workout = idOf(data, "workout");
    expect(stillOpenYesterday(data, TODAY).map((h) => h.name)).toEqual(["workout", "read"]);
    data = toggleTick(data, workout, YESTERDAY, TODAY);
    expect(stillOpenYesterday(data, TODAY).map((h) => h.name)).toEqual(["read"]);
  });

  it("has nothing open on day one — there is no yesterday to forget", () => {
    const data = account(1, ["workout"]);
    expect(stillOpenYesterday(data, TODAY)).toEqual([]);
  });
});

describe("Day Records are immutable once closed", () => {
  it("freezes the Active set of a Day that was never opened", () => {
    const data = account(5, ["workout", "read"]);
    expect(data.days[CLOSED]?.active).toHaveLength(2);
    expect(data.days[CLOSED]?.ticked).toEqual([]);
  });

  it("keeps a closed Day's denominator when a Habit is archived later", () => {
    let data = account(5, ["workout", "read"]);
    data = seed(data, idOf(data, "workout"), [2]);
    expect(intensityAt(data, CLOSED)).toBe(2); // one of two → half

    data = setArchived(data, idOf(data, "read"), true, TODAY);
    data = sealDays(data, TODAY);

    // Archiving cannot brighten the past by shrinking the denominator.
    expect(data.days[CLOSED]?.active).toHaveLength(2);
    expect(intensityAt(data, CLOSED)).toBe(2);
  });

  it("drops an archived Habit from today's denominator, from today forward", () => {
    let data = account(5, ["workout", "read"]);
    data = setArchived(data, idOf(data, "read"), true, TODAY);
    expect(data.days[TODAY]?.active).toEqual([idOf(data, "workout")]);
    expect(data.days[YESTERDAY]?.active).toHaveLength(2);
  });

  it("counts a Habit added today toward today only", () => {
    let data = account(5, ["workout"]);
    data = addHabit(data, "read", TODAY);
    expect(data.days[TODAY]?.active).toHaveLength(2);
    expect(data.days[YESTERDAY]?.active).toHaveLength(1);
    expect(activeOn(data.habits, CLOSED)).toHaveLength(1);
  });

  it("refuses a Tick for a Habit that was not Active that Day", () => {
    let data = account(5, ["workout"]);
    data = addHabit(data, "read", TODAY);
    const read = idOf(data, "read");
    expect(toggleTick(data, read, YESTERDAY, TODAY)).toBe(data);
  });

  it("seals the Days missed while the app was closed", () => {
    const data = account(30, ["workout"]);
    expect(Object.keys(data.days)).toHaveLength(30);
    expect(Object.values(data.days).every((d) => d.active.length === 1)).toBe(true);
  });
});

describe("Intensity", () => {
  it("is the proportion of that Day's Active Habits, in quartiles", () => {
    const base = account(5, ["a", "b", "c", "d"]);
    const ids = base.habits.map((h) => h.id);
    const level = (n: number) => {
      let data = base;
      for (const id of ids.slice(0, n)) data = seed(data, id, [2]);
      return intensityAt(data, CLOSED);
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
      expect(intensityAt(data, CLOSED)).toBe(4);
    }
  });

  it("is 0 on a Day with no Active Habits", () => {
    const data = account(5, []);
    expect(intensityAt(data, CLOSED)).toBe(0);
  });
});

describe("Chains", () => {
  it("counts strictly consecutive Days back from today", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [0, 1, 2, 3]);
    expect(chainOf(data, workout, TODAY)).toBe(4);
  });

  it("does not report a Chain broken while today is still open", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [1, 2, 3]);
    expect(chainOf(data, workout, TODAY)).toBe(3);
  });

  it("is never forgiven or repaired by a single missed Day", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [1, 3, 4, 5, 6]);
    expect(chainOf(data, workout, TODAY)).toBe(1);
    data = account(20, ["workout"]);
    data = seed(data, idOf(data, "workout"), [3, 4, 5, 6]);
    expect(chainOf(data, idOf(data, "workout"), TODAY)).toBe(0);
  });

  it("remembers the longest Chain even after it breaks", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    data = seed(data, workout, [0, 1, 5, 6, 7, 8, 9]);
    expect(chainOf(data, workout, TODAY)).toBe(2);
    expect(longestChainOf(data, workout, TODAY)).toBe(5);
  });

  it("belongs to a single Habit — there is no Chain across Habits", () => {
    let data = account(20, ["a", "b"]);
    const a = idOf(data, "a");
    const b = idOf(data, "b");
    data = seed(data, a, [0, 1]);
    data = seed(data, b, [2, 3]);
    expect(chainOf(data, a, TODAY)).toBe(2);
    expect(chainOf(data, b, TODAY)).toBe(0);
  });

  it("is unchained by default, and opting in changes nothing but the display", () => {
    let data = account(20, ["workout"]);
    const workout = idOf(data, "workout");
    expect(data.habits[0]!.chained).toBe(false);
    data = seed(data, workout, [0, 1, 2]);
    const before = totalTicks(data, TODAY);
    data = setChained(data, workout, true);
    expect(totalTicks(data, TODAY)).toBe(before);
    expect(chainOf(data, workout, TODAY)).toBe(3);
  });
});

describe("the Total", () => {
  it("counts every Tick across all Habits in the last year", () => {
    let data = account(30, ["a", "b"]);
    data = seed(data, idOf(data, "a"), [0, 1, 2]);
    data = seed(data, idOf(data, "b"), [0, 4]);
    expect(totalTicks(data, TODAY)).toBe(5);
    expect(tickCountOf(data, idOf(data, "a"), TODAY)).toBe(3);
  });

  it("only ever rises — a broken Chain does not touch it", () => {
    let data = account(30, ["a"]);
    const a = idOf(data, "a");
    data = seed(data, a, [5, 6, 7]);
    const afterChain = totalTicks(data, TODAY);
    data = seed(data, a, [0]); // a new, unrelated Tick after a long gap
    expect(chainOf(data, a, TODAY)).toBe(1);
    expect(totalTicks(data, TODAY)).toBe(afterChain + 1);
  });

  it("survives archiving, because the past is untouched", () => {
    let data = account(30, ["a"]);
    data = seed(data, idOf(data, "a"), [3, 4, 5]);
    const before = totalTicks(data, TODAY);
    data = setArchived(data, idOf(data, "a"), true, TODAY);
    expect(totalTicks(data, TODAY)).toBe(before);
    expect(liveHabits(data, TODAY)).toEqual([]);
    expect(data.habits).toHaveLength(1); // archived, not deleted
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
    // v1 and v2 are both read — v1 is migrated, per ADR 0003. A version this
    // app has never written is still refused outright.
    expect(parseAppData({ version: 3, installedOn: TODAY })).toBeNull();
    expect(parseAppData({ version: 1 })).toBeNull();
    expect(parseAppData({ version: 2 })).toBeNull();
    expect(parseAppData({ version: 1, installedOn: "yesterday" })).toBeNull();
  });

  it("discards Ticks that reference a Habit the file does not contain", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "workout", createdOn: TODAY, archivedOn: null }],
      days: { [TODAY]: { date: TODAY, active: ["h1", "ghost"], ticked: ["h1", "ghost"] } },
      theme: "system",
    });
    expect(parsed?.days[TODAY]).toEqual({ date: TODAY, active: ["h1"], ticked: ["h1"] });
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
    expect(parsed?.habits[0]?.chained).toBe(false);
  });
});
