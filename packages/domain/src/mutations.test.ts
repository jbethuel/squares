import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import {
  addHabit,
  renameHabit,
  setHidden,
  setSharedName,
  setStreaks,
  setTheme,
  toggleLog,
} from "./mutations";
import { activeOn, hiddenHabits, isHidden, totalLogs, visibleHabits } from "./selectors";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
const YESTERDAY = addDays(TODAY, -1);

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = emptyData(installedOn);
  for (const name of names) data = addHabit(data, name, installedOn);
  return data;
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

  it("starts every Habit without a Streak and unnamed on the Share Card", () => {
    const data = addHabit(emptyData(TODAY), "took my meds", TODAY);
    expect(data.habits[0]?.streaks).toBe(false);
    expect(data.habits[0]?.sharedName).toBe(false);
    expect(data.habits[0]?.spans).toEqual([{ from: TODAY, to: null }]);
  });

  it("gives each Habit its own id", () => {
    let data = emptyData(TODAY);
    for (const name of ["a", "b", "c"]) data = addHabit(data, name, TODAY);
    expect(new Set(data.habits.map((h) => h.id)).size).toBe(3);
  });

  it("writes no Day Record, because a Habit with no Logs has nothing to record", () => {
    const data = addHabit(emptyData(TODAY), "workout", TODAY);
    expect(data.days).toEqual({});
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

describe("Hide is not delete", () => {
  it("stops the Habit from today forward and keeps every Log it made", () => {
    let data = account(10, ["workout", "read"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    data = setHidden(data, workout, true, TODAY);

    expect(isHidden(data.habits.find((h) => h.id === workout)!, TODAY)).toBe(true);
    expect(data.habits).toHaveLength(2);
    expect(activeOn(data.habits, TODAY)).not.toContain(workout);
    expect(activeOn(data.habits, YESTERDAY)).toContain(workout);
    expect(data.days[TODAY]?.logged).toEqual([workout]);
  });

  it("cannot be applied twice, so the Span's end is never moved", () => {
    let data = account(10, ["workout"]);
    data = setHidden(data, idOf(data, "workout"), true, TODAY);
    const later = setHidden(data, idOf(data, "workout"), true, addDays(TODAY, 5));
    expect(later).toBe(data);
    expect(later.habits[0]?.spans).toEqual([{ from: data.installedOn, to: TODAY }]);
  });

  it("ignores a Habit that does not exist", () => {
    const before = account(10, ["workout"]);
    expect(setHidden(before, "ghost", true, TODAY)).toBe(before);
  });

  it("comes back from today forward, leaving the Hidden Days a permanent gap", () => {
    const later = addDays(TODAY, 5);
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = setHidden(data, workout, true, TODAY);
    data = setHidden(data, workout, false, later);

    // A new Span, not a reopened one: coming back is never backdated.
    expect(data.habits[0]?.spans).toEqual([
      { from: data.installedOn, to: TODAY },
      { from: later, to: null },
    ]);
    expect(isHidden(data.habits[0]!, later)).toBe(false);
    expect(activeOn(data.habits, addDays(TODAY, 2))).not.toContain(workout);
    expect(activeOn(data.habits, later)).toContain(workout);
  });

  it("treats hiding and changing your mind the same Day as an undo", () => {
    // Otherwise every mis-tap of the switch leaves a zero-length Span behind
    // for as long as the record exists.
    const before = account(10, ["workout"]);
    const workout = idOf(before, "workout");
    const after = setHidden(setHidden(before, workout, true, TODAY), workout, false, TODAY);

    expect(after.habits[0]?.spans).toEqual([{ from: before.installedOn, to: null }]);
    expect(after.days).toEqual(before.days);
  });

  it("cannot bring back a Habit that is not Hidden", () => {
    const before = account(10, ["workout"]);
    expect(setHidden(before, idOf(before, "workout"), false, TODAY)).toBe(before);
  });

  it("takes the Habit off Home and puts it in the Hidden list", () => {
    let data = account(10, ["workout"]);
    data = setHidden(data, idOf(data, "workout"), true, TODAY);
    expect(visibleHabits(data, TODAY)).toEqual([]);
    expect(hiddenHabits(data, TODAY)).toHaveLength(1);
  });

  it("takes its Logs out of the Total, and gives them back on the way in", () => {
    const later = addDays(TODAY, 5);
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    expect(totalLogs(data, TODAY)).toBe(1);

    data = setHidden(data, workout, true, TODAY);
    expect(totalLogs(data, TODAY)).toBe(0);

    data = setHidden(data, workout, false, later);
    expect(totalLogs(data, later)).toBe(1);
  });

  it("leaves the Log on the record even while it is out of the Total", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    data = setHidden(data, workout, true, TODAY);
    expect(data.days[TODAY]?.logged).toEqual([workout]);
  });
});

describe("preferences change nothing but the display", () => {
  it("keeps the year identical when a Streak is turned on", () => {
    const before = account(10, ["workout"]);
    const after = setStreaks(before, idOf(before, "workout"), true);
    expect(after.habits[0]?.streaks).toBe(true);
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

describe("the Log refuses what it cannot record", () => {
  it("refuses a Day in the future", () => {
    const data = account(10, ["workout"]);
    expect(toggleLog(data, idOf(data, "workout"), addDays(TODAY, 1), TODAY)).toBe(data);
  });

  it("refuses yesterday", () => {
    const data = account(10, ["workout"]);
    expect(toggleLog(data, idOf(data, "workout"), YESTERDAY, TODAY)).toBe(data);
  });

  it("refuses a Habit that does not exist", () => {
    const data = account(10, ["workout"]);
    expect(toggleLog(data, "ghost", TODAY, TODAY)).toBe(data);
  });

  it("refuses a Hidden Habit", () => {
    let data = account(10, ["workout"]);
    const workout = idOf(data, "workout");
    data = setHidden(data, workout, true, TODAY);
    expect(toggleLog(data, workout, TODAY, TODAY)).toBe(data);
  });

  it("leaves other Habits' Logs on the Day alone", () => {
    let data = account(10, ["a", "b"]);
    data = toggleLog(data, idOf(data, "a"), TODAY, TODAY);
    data = toggleLog(data, idOf(data, "b"), TODAY, TODAY);
    data = toggleLog(data, idOf(data, "a"), TODAY, TODAY);
    expect(data.days[TODAY]?.logged).toEqual([idOf(data, "b")]);
  });
});
