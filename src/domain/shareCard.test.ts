import { describe, expect, it } from "vitest";
import { addDays, type DateKey } from "./date";
import { addHabit, setArchived, sealDays, setSharedName } from "./mutations";
import { shareCardModel } from "./shareCard";
import { parseAppData } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";

function account(age: number, names: string[]): AppData {
  const installedOn = addDays(TODAY, -(age - 1));
  let data = sealDays(emptyData(installedOn), TODAY);
  for (const name of names) data = addHabit(data, name, installedOn);
  return sealDays(data, TODAY);
}

const idOf = (data: AppData, name: string) => data.habits.find((h) => h.name === name)!.id;

describe("the Share Card is anonymous by default", () => {
  it("carries no Habit names at all unless one was opted in", () => {
    const data = account(60, ["took my meds", "no drinking"]);
    expect(data.habits.every((habit) => habit.sharedName === false)).toBe(true);
    expect(shareCardModel(data, TODAY).names).toEqual([]);
  });

  it("carries only the Habits individually opted in, not the rest", () => {
    let data = account(60, ["workout", "no drinking", "pickleball"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    data = setSharedName(data, idOf(data, "pickleball"), true);
    expect(shareCardModel(data, TODAY).names).toEqual(["workout", "pickleball"]);
  });

  it("drops a name the moment the opt-in is withdrawn", () => {
    let data = account(60, ["took my meds"]);
    const meds = idOf(data, "took my meds");
    data = setSharedName(data, meds, true);
    expect(shareCardModel(data, TODAY).names).toEqual(["took my meds"]);
    data = setSharedName(data, meds, false);
    expect(shareCardModel(data, TODAY).names).toEqual([]);
  });

  it("drops an archived Habit's name, whose opt-in can no longer be withdrawn", () => {
    let data = account(60, ["no drinking"]);
    data = setSharedName(data, idOf(data, "no drinking"), true);
    data = setArchived(data, idOf(data, "no drinking"), true, TODAY);
    expect(shareCardModel(data, TODAY).names).toEqual([]);
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
    expect(shareCardModel(parsed!, TODAY).names).toEqual([]);
  });

  it("keeps a deliberate opt-in across an export and re-import", () => {
    // Restoring your own backup must not silently drop settings you chose.
    // The card names every Habit it will show before it is saved, so a
    // preserved opt-in is visible rather than a surprise.
    let data = account(60, ["workout"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    const restored = parseAppData(JSON.parse(JSON.stringify(data)));
    expect(shareCardModel(restored!, TODAY).names).toEqual(["workout"]);
  });
});

describe("the Share Card model", () => {
  it("shows the Total and the same Intensity as the Overview", () => {
    let data = account(30, ["a", "b"]);
    const days = { ...data.days };
    days[TODAY] = { ...days[TODAY]!, ticked: [idOf(data, "a"), idOf(data, "b")] };
    days[addDays(TODAY, -1)] = { ...days[addDays(TODAY, -1)]!, ticked: [idOf(data, "a")] };
    data = { ...data, days };

    const model = shareCardModel(data, TODAY);
    expect(model.total).toBe(3);
    expect(model.levels[0]).toBe(4); // both Habits today
    expect(model.levels[1]).toBe(2); // one of two yesterday
    expect(model.levels[2]).toBe(0);
    expect(model.levels).toHaveLength(30);
  });

  it("is one Square on day one, like the Overview", () => {
    const model = shareCardModel(account(1, ["a"]), TODAY);
    expect(model.elapsed).toBe(1);
    expect(model.levels).toHaveLength(1);
  });

  it("carries no date, handle or per-Habit breakdown", () => {
    let data = account(60, ["workout"]);
    data = setSharedName(data, idOf(data, "workout"), true);
    const model = shareCardModel(data, TODAY);
    // The whole surface of the card is these five fields.
    expect(Object.keys(model).sort()).toEqual(["elapsed", "levels", "names", "total", "weekday"]);
  });
});
