import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit, setHidden, setSharedName } from "./mutations";
import { shareCardModel } from "./shareCard";
import { parseAppData } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = emptyData(installedOn);
  for (const name of names) data = addHabit(data, name, installedOn);
  return data;
}

const idOf = (data: AppData, name: string) => data.habits.find((h) => h.name === name)!.id;

describe("the Share Card is anonymous by default", () => {
  it("carries no Habit names at all unless one was opted in", () => {
    const data = account(60, ["took my meds", "no drinking"]);
    expect(data.habits.every((habit) => habit.sharedName === false)).toBe(true);
    expect(shareCardModel(data, TODAY, "year").names).toEqual([]);
  });

  it("carries only the Habits individually opted in, not the rest", () => {
    let data = account(60, ["workout", "no drinking", "pickleball"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    data = setSharedName(data, idOf(data, "pickleball"), true);
    expect(shareCardModel(data, TODAY, "year").names).toEqual(["workout", "pickleball"]);
  });

  it("drops a name the moment the opt-in is withdrawn", () => {
    let data = account(60, ["took my meds"]);
    const meds = idOf(data, "took my meds");
    data = setSharedName(data, meds, true);
    expect(shareCardModel(data, TODAY, "year").names).toEqual(["took my meds"]);
    data = setSharedName(data, meds, false);
    expect(shareCardModel(data, TODAY, "year").names).toEqual([]);
  });

  it("drops an hidden Habit's name, whatever its opt-in says", () => {
    let data = account(60, ["no drinking"]);
    data = setSharedName(data, idOf(data, "no drinking"), true);
    data = setHidden(data, idOf(data, "no drinking"), true, TODAY);
    expect(shareCardModel(data, TODAY, "year").names).toEqual([]);
  });

  it("treats a missing opt-in in an imported file as off, never as on", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "took my meds", createdOn: TODAY, archivedOn: null }],
      days: {},
      theme: "system",
    });
    expect(parsed!.habits[0]!.sharedName).toBe(false);
    expect(shareCardModel(parsed!, TODAY, "year").names).toEqual([]);
  });

  it("keeps a deliberate opt-in across an export and re-import", () => {
    // Restoring your own backup must not silently drop settings you chose.
    // The card names every Habit it will show before it is saved, so a
    // preserved opt-in is visible rather than a surprise.
    let data = account(60, ["workout"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    const restored = parseAppData(JSON.parse(JSON.stringify(data)));
    expect(shareCardModel(restored!, TODAY, "year").names).toEqual(["workout"]);
  });
});

describe("the Share Card model", () => {
  /** Two Habits, both Logged today, one of two yesterday. */
  function logged(age: number): AppData {
    const data = account(age, ["a", "b"]);
    const days = { ...data.days };
    days[TODAY] = { date: TODAY, logged: [idOf(data, "a"), idOf(data, "b")] };
    days[addDays(TODAY, -1)] = { date: addDays(TODAY, -1), logged: [idOf(data, "a")] };
    return { ...data, days };
  }

  it("draws the same Intensity as the Overview", () => {
    const model = shareCardModel(logged(30), TODAY, "year");
    expect(model.levels[0]).toBe(4); // both Habits today
    expect(model.levels[1]).toBe(2); // one of two yesterday
    expect(model.levels[2]).toBe(0);
  });

  // The Tally counts the Frame drawn, so it is not the Total and it can fall.
  // A number that can fall may not be called a Total — see CONTEXT.md.
  it("tallies only the Days it drew", () => {
    const data = logged(30);
    expect(shareCardModel(data, TODAY, "year").tally).toBe(3);
    // Today is a Monday, so the week reaches back two Days: both Logs today
    // and the single one yesterday.
    expect(shareCardModel(data, TODAY, "week").tally).toBe(3);
    // The same three, drawn over a whole week rather than a whole year.
    expect(shareCardModel(data, TODAY, "week").levels).toHaveLength(2);
  });

  it("draws the Week in one row, and the rest as calendar blocks", () => {
    const data = account(60, ["a"]);
    expect(shareCardModel(data, TODAY, "week").rows).toBe(1);
    expect(shareCardModel(data, TODAY, "month").rows).toBe(7);
    expect(shareCardModel(data, TODAY, "year").rows).toBe(7);
  });

  // A Week card made on a Wednesday used to be four Squares, which does not
  // read as a week. The Frame is a calendar and does not shrink to fit.
  it("draws the whole Frame, including the Days still to come", () => {
    const model = shareCardModel(account(60, ["a"]), TODAY, "week");
    // Monday: two Days back including today, five still to come.
    expect(model.frame).toEqual({ back: 2, ahead: 5 });
  });

  it("draws a full year from day one, exactly as the Overview does", () => {
    const model = shareCardModel(account(1, ["a"]), TODAY, "year");
    expect(model.frame).toEqual({ back: 365, ahead: 0 });
    // Days from before the account existed are drawn, at Intensity 0.
    expect(model.levels).toHaveLength(365);
    expect(model.levels[364]).toBe(0);
  });

  it("carries no date, handle or per-Habit breakdown", () => {
    let data = account(60, ["workout"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    const model = shareCardModel(data, TODAY, "year");
    // The whole surface of the card is these seven fields.
    expect(Object.keys(model).sort()).toEqual([
      "frame",
      "lens",
      "levels",
      "names",
      "rows",
      "tally",
      "weekday",
    ]);
  });
});
