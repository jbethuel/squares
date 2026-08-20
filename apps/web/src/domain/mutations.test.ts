import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import {
  addHabit,
  setArchived,
  renameHabit,
  sealDays,
  setChained,
  setSharedName,
  setTheme,
  toggleTick,
} from "./mutations";
import { activeOn, isArchived, liveHabits, totalTicks } from "./selectors";
import { emptyData, YEAR, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);
const CLOSED = addDays(TODAY, -2);

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = sealDays(emptyData(installedOn), TODAY);
  for (const name of names) data = addHabit(data, name, installedOn);
  return sealDays(data, TODAY);
}

const idOf = (data: AppData, name: string) => data.habits.find((h) => h.name === name)!.id;

describe("naming a Habit", () => {
  it("trims the name it is given", () => {
    const data = addHabit(emptyData(TODAY), "  workout  ", TODAY);
    expect(data.habits[0]?.name).toBe("workout");
  });

  it("refuses a name that is only whitespace, without failing", () => {
    const before = account(5, []);
    expect(addHabit(before, "   ", TODAY)).toBe(before);
    expect(addHabit(before, "", TODAY)).toBe(before);
  });

  it("starts every Habit unchained and unnamed on the Share Card", () => {
    const data = addHabit(emptyData(TODAY), "took my meds", TODAY);
    expect(data.habits[0]?.chained).toBe(false);
    expect(data.habits[0]?.sharedName).toBe(false);
    expect(data.habits[0]?.spans).toEqual([{ from: TODAY, to: null }]);
  });

  it("gives each Habit its own id", () => {
    let data = emptyData(TODAY);
    for (const name of ["a", "b", "c"]) data = addHabit(data, name, TODAY);
    expect(new Set(data.habits.map((h) => h.id)).size).toBe(3);
  });

  it("renames without touching the year", () => {
    const before = account(10, ["workout"]);
    const after = renameHabit(before, idOf(before, "workout"), "  lift  ");
    expect(after.habits[0]?.name).toBe("lift");
    expect(after.days).toEqual(before.days);
    expect(after.habits[0]?.id).toBe(before.habits[0]?.id);
  });

  it("refuses to rename a Habit to nothing", () => {
    const before = account(10, ["workout"]);
    expect(renameHabit(before, idOf(before, "workout"), "  ")).toBe(before);
  });

  it("ignores an edit to a Habit that does not exist", () => {
    const before = account(10, ["workout"]);
    expect(renameHabit(before, "ghost", "lift").habits).toEqual(before.habits);
  });
});

describe("Archive is not delete", () => {
  it("retires the Habit from today forward and keeps its history", () => {
    let data = account(10, ["workout", "read"]);
    const workout = idOf(data, "workout");
    data = setArchived(data, workout, true, TODAY);

    expect(isArchived(data.habits.find((h) => h.id === workout)!, TODAY)).toBe(true);
    expect(data.habits).toHaveLength(2);
    expect(activeOn(data.habits, TODAY)).not.toContain(workout);
    expect(data.days[YESTERDAY]?.active).toContain(workout);
    expect(data.days[CLOSED]?.active).toContain(workout);
  });

  it("cannot be applied twice, so the Span's end is never moved", () => {
    let data = account(10, ["workout"]);
    data = setArchived(data, idOf(data, "workout"), true, TODAY);
    const later = setArchived(data, idOf(data, "workout"), true, addDays(TODAY, 5));
    expect(later).toBe(data);
    expect(later.habits[0]?.spans).toEqual([{ from: data.installedOn, to: TODAY }]);
  });

  it("ignores a Habit that does not exist", () => {
    const before = account(10, ["workout"]);
    expect(setArchived(before, "ghost", true, TODAY)).toBe(before);
  });

  it("comes back from today forward, leaving the Archived Days a permanent gap", () => {
    const later = addDays(TODAY, 5);
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = setArchived(data, workout, true, TODAY);
    data = setArchived(data, workout, false, later);

    // A new Span, not a reopened one: coming back is never backdated.
    expect(data.habits[0]?.spans).toEqual([
      { from: data.installedOn, to: TODAY },
      { from: later, to: null },
    ]);
    expect(isArchived(data.habits[0]!, later)).toBe(false);
    expect(activeOn(data.habits, addDays(TODAY, 2))).not.toContain(workout);
    expect(activeOn(data.habits, later)).toContain(workout);
  });

  it("treats archiving and changing your mind the same Day as an undo", () => {
    // Otherwise every mis-tap of the switch leaves a zero-length Span behind
    // for as long as the record exists.
    const before = account(10, ["workout"]);
    const workout = idOf(before, "workout");
    const after = setArchived(setArchived(before, workout, true, TODAY), workout, false, TODAY);

    expect(after.habits[0]?.spans).toEqual([{ from: before.installedOn, to: null }]);
    expect(after.days).toEqual(before.days);
  });

  it("cannot be taken out of an Archive it is not in", () => {
    const before = account(10, ["workout"]);
    expect(setArchived(before, idOf(before, "workout"), false, TODAY)).toBe(before);
  });

  it("removes today's Day Record when the last Habit is archived", () => {
    // A Day with no Active Habits is not a Day Record — Intensity would have no
    // denominator. Yesterday, which had one, is untouched.
    let data = account(10, ["workout"]);
    data = setArchived(data, idOf(data, "workout"), true, TODAY);
    expect(data.days[TODAY]).toBeUndefined();
    expect(data.days[YESTERDAY]?.active).toHaveLength(1);
    expect(liveHabits(data, TODAY)).toEqual([]);
  });

  it("drops an archived Habit's Tick from an open Day it is no longer Active on", () => {
    let data = account(10, ["workout", "read"]);
    const workout = idOf(data, "workout");
    data = toggleTick(data, workout, TODAY, TODAY);
    expect(data.days[TODAY]?.ticked).toEqual([workout]);
    data = setArchived(data, workout, true, TODAY);
    expect(data.days[TODAY]?.ticked).toEqual([]);
    expect(data.days[TODAY]?.active).toEqual([idOf(data, "read")]);
  });

  it("leaves the Total alone, because the past is untouched", () => {
    let data = account(10, ["workout"]);
    data = toggleTick(data, idOf(data, "workout"), YESTERDAY, TODAY);
    const before = totalTicks(data, TODAY);
    data = setArchived(data, idOf(data, "workout"), true, TODAY);
    expect(totalTicks(data, TODAY)).toBe(before);
  });
});

describe("preferences change nothing but the display", () => {
  it("keeps the year identical when a Chain is opted into", () => {
    const before = account(10, ["workout"]);
    const after = setChained(before, idOf(before, "workout"), true);
    expect(after.habits[0]?.chained).toBe(true);
    expect(after.days).toEqual(before.days);
  });

  it("keeps the year identical when a name is opted into the Share Card", () => {
    const before = account(10, ["workout"]);
    const after = setSharedName(before, idOf(before, "workout"), true);
    expect(after.habits[0]?.sharedName).toBe(true);
    expect(after.days).toEqual(before.days);
  });

  it("stores the theme without touching Habits", () => {
    const before = account(10, ["workout"]);
    const after = setTheme(before, "light");
    expect(after.theme).toBe("light");
    expect(after.habits).toEqual(before.habits);
  });
});

describe("sealDays", () => {
  it("returns the very same object when there is nothing to do", () => {
    // The store re-seals on every rollover tick; a new object each time would
    // make that effect loop.
    const data = account(10, ["workout"]);
    expect(sealDays(data, TODAY)).toBe(data);
  });

  it("is idempotent", () => {
    const once = account(10, ["workout"]);
    expect(sealDays(sealDays(once, TODAY), TODAY)).toEqual(once);
  });

  it("writes no Day Records for an account with no Habits", () => {
    expect(sealDays(emptyData(addDays(TODAY, -9)), TODAY).days).toEqual({});
  });

  it("refreshes an open Day's Active set but never a closed one", () => {
    let data = account(10, ["workout"]);
    data = addHabit(data, "read", TODAY);
    expect(data.days[TODAY]?.active).toHaveLength(2);
    expect(data.days[YESTERDAY]?.active).toHaveLength(1);
    expect(data.days[CLOSED]?.active).toHaveLength(1);
  });

  it("caps the year it materialises at 365 Days", () => {
    const installedOn = addDays(TODAY, -499);
    const sealed = sealDays(
      {
        ...emptyData(installedOn),
        habits: [
          { id: "h1", name: "workout", spans: [{ from: installedOn, to: null }], chained: false, sharedName: false },
        ],
      },
      TODAY,
    );
    expect(Object.keys(sealed.days)).toHaveLength(YEAR);
    expect(sealed.days[addDays(TODAY, -(YEAR - 1))]).toBeDefined();
    expect(sealed.days[addDays(TODAY, -YEAR)]).toBeUndefined();
  });
});

describe("the Tick refuses what it cannot record", () => {
  it("refuses a Day in the future", () => {
    const data = account(10, ["workout"]);
    expect(toggleTick(data, idOf(data, "workout"), addDays(TODAY, 1), TODAY)).toBe(data);
  });

  it("refuses a Habit that does not exist", () => {
    const data = account(10, ["workout"]);
    expect(toggleTick(data, "ghost", TODAY, TODAY)).toBe(data);
  });

  it("refuses a Day with no record at all", () => {
    const data = account(1, ["workout"]);
    // Day one has no yesterday to record against.
    expect(toggleTick(data, idOf(data, "workout"), YESTERDAY, TODAY)).toBe(data);
  });

  it("leaves other Habits' Ticks on the Day alone", () => {
    let data = account(10, ["a", "b"]);
    data = toggleTick(data, idOf(data, "a"), TODAY, TODAY);
    data = toggleTick(data, idOf(data, "b"), TODAY, TODAY);
    data = toggleTick(data, idOf(data, "a"), TODAY, TODAY);
    expect(data.days[TODAY]?.ticked).toEqual([idOf(data, "b")]);
  });
});
