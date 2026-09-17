import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit, setHidden, setStreaks, toggleLog } from "./mutations";
import { habitCardModel, shareCardModel } from "./shareCard";
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

describe("the Share Card names every visible Habit", () => {
  // ADR 0010: naming is unconditional. There is no per-Habit opt-in left to
  // withhold a name from the card — only Hide removes one.
  it("names every Habit, with no opt-in required", () => {
    const data = account(60, ["took my meds", "no drinking"]);
    expect(shareCardModel(data, TODAY, "year").names).toEqual(["took my meds", "no drinking"]);
  });

  it("drops a Habit's name the moment it is Hidden", () => {
    let data = account(60, ["no drinking"]);
    data = setHidden(data, idOf(data, "no drinking"), true, TODAY);
    expect(shareCardModel(data, TODAY, "year").names).toEqual([]);
  });

  it("names a Habit read back from an import, the same as any other", () => {
    const parsed = parseAppData({
      version: 1,
      installedOn: TODAY,
      habits: [{ id: "h1", name: "took my meds", createdOn: TODAY, archivedOn: null }],
      days: {},
      theme: "system",
    });
    expect(shareCardModel(parsed!, TODAY, "year").names).toEqual(["took my meds"]);
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
    const data = account(60, ["workout"]);
    const model = shareCardModel(data, TODAY, "year");
    // The whole surface of the card is these eight fields.
    expect(Object.keys(model).sort()).toEqual([
      "frame",
      "lens",
      "levels",
      "names",
      "rows",
      "streak",
      "tally",
      "weekday",
    ]);
    // An Overview Card has no one Habit to keep a Streak for. See ADR 0011.
    expect(model.streak).toBeNull();
  });
});

describe("the Habit Card", () => {
  it("names only the one Habit it draws from", () => {
    const data = account(60, ["took my meds", "no drinking"]);
    const id = idOf(data, "took my meds");
    expect(habitCardModel(data, id, TODAY, "year")!.names).toEqual(["took my meds"]);
  });

  it("gives a Hidden Habit no card at all", () => {
    let data = account(60, ["no drinking"]);
    const id = idOf(data, "no drinking");
    data = setHidden(data, id, true, TODAY);
    expect(habitCardModel(data, id, TODAY, "year")).toBeNull();
  });

  it("gives a Habit that no longer exists no card either", () => {
    const data = account(60, ["workout"]);
    expect(habitCardModel(data, "not-an-id", TODAY, "year")).toBeNull();
  });

  it("draws binary Squares, exactly as the Habit's own Heatmap does", () => {
    let data = account(30, ["workout"]);
    const id = idOf(data, "workout");
    data = toggleLog(data, id, TODAY, TODAY);
    const model = habitCardModel(data, id, TODAY, "year")!;
    expect(model.levels[0]).toBe(3);
    expect(model.levels[1]).toBe(0);
  });

  it("tallies only this Habit's own Logs, not every Habit's", () => {
    let data = account(30, ["workout", "read"]);
    const workout = idOf(data, "workout");
    data = toggleLog(data, workout, TODAY, TODAY);
    data = toggleLog(data, idOf(data, "read"), TODAY, TODAY);
    expect(habitCardModel(data, workout, TODAY, "year")!.tally).toBe(1);
  });

  it("carries no Streak unless the Habit is a Streak Habit", () => {
    const data = account(30, ["workout"]);
    const id = idOf(data, "workout");
    expect(habitCardModel(data, id, TODAY, "year")!.streak).toBeNull();
  });

  it("carries the Streak once the Habit opts in, matching its own Screen", () => {
    let data = account(30, ["workout"]);
    const id = idOf(data, "workout");
    data = setStreaks(data, id, true);
    data = toggleLog(data, id, TODAY, TODAY);
    expect(habitCardModel(data, id, TODAY, "year")!.streak).toBe(1);
  });
});
