import { describe, expect, it } from "vitest";
import { addDays, toKey, type DateKey } from "./date";
import { addHabit, sealDays, setArchived, setSharedName, toggleTick } from "./mutations";
import {
  HORIZON_DAYS,
  PENDING_LIMIT,
  noReminders,
  outstandingOn,
  parseReminderSettings,
  planReminders,
  reconcileReminders,
  reminderAt,
  reminderFor,
  serialiseReminders,
  setDailyReminder,
  setHabitReminder,
  type ReminderSettings,
  type TimeOfDay,
} from "./reminders";
import { serialise } from "./storage";
import { emptyData, type AppData } from "./types";

const TODAY: DateKey = "2026-08-03";
/** Nine in the morning, so an evening Reminder is still ahead. */
const MORNING = new Date(2026, 7, 3, 9, 0);
const EVENING: TimeOfDay = { hour: 20, minute: 0 };

function account(names: string[], today: DateKey = TODAY): AppData {
  let data = sealDays(emptyData(addDays(today, -9)), today);
  for (const name of names) data = addHabit(data, name, addDays(today, -9));
  return sealDays(data, today);
}

function idOf(data: AppData, name: string): string {
  const habit = data.habits.find((h) => h.name === name);
  if (!habit) throw new Error(`no habit named ${name}`);
  return habit.id;
}

function daily(time: TimeOfDay = EVENING): ReminderSettings {
  return setDailyReminder(noReminders(), time);
}

describe("Reminders are off until the user turns them on", () => {
  it("plans nothing for a fresh device with Habits on it", () => {
    expect(planReminders(account(["yoga", "meds"]), noReminders(), MORNING)).toEqual([]);
  });

  it("has no Daily Reminder and no Reminded Habits by default", () => {
    const settings = noReminders();
    expect(settings.daily).toBeNull();
    expect(reminderFor(settings, "anything")).toBeNull();
  });

  it("turns the Daily Reminder off again by setting no time, not a flag", () => {
    expect(setDailyReminder(daily(), null).daily).toBeNull();
  });

  it("refuses a time that is not on the clock", () => {
    const settings = daily();
    expect(setDailyReminder(settings, { hour: 24, minute: 0 })).toBe(settings);
    expect(setHabitReminder(settings, "id", { hour: 9, minute: 60 })).toBe(settings);
  });
});

describe("the Daily Reminder", () => {
  it("is one notification a Day, at the time the user picked", () => {
    const plan = planReminders(account(["yoga", "meds"]), daily(), MORNING);
    const todays = plan.filter((r) => r.date === TODAY);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.time).toEqual(EVENING);
  });

  it("counts the Day's outstanding Active Habits", () => {
    const data = account(["yoga", "meds", "walk"]);
    expect(planReminders(data, daily(), MORNING)[0]!.body).toBe("3 Habits left");
  });

  it("stays silent on a Day whose Active Habits were all Ticked", () => {
    let data = account(["yoga", "meds"]);
    data = toggleTick(data, idOf(data, "yoga"), TODAY, TODAY);
    data = toggleTick(data, idOf(data, "meds"), TODAY, TODAY);
    const plan = planReminders(data, daily(), MORNING);
    expect(plan.some((r) => r.date === TODAY)).toBe(false);
    // Tomorrow is untouched: nothing is Ticked there yet.
    expect(plan.some((r) => r.date === addDays(TODAY, 1))).toBe(true);
  });

  it("still prompts while one Habit is left", () => {
    let data = account(["yoga", "meds"]);
    data = toggleTick(data, idOf(data, "yoga"), TODAY, TODAY);
    const todays = planReminders(data, daily(), MORNING).find((r) => r.date === TODAY);
    expect(todays?.body).toBe("1 Habit left");
  });

  it("comes back if the Tick that silenced it is undone", () => {
    const data = account(["yoga"]);
    const id = idOf(data, "yoga");
    const ticked = toggleTick(data, id, TODAY, TODAY);
    expect(planReminders(ticked, daily(), MORNING).some((r) => r.date === TODAY)).toBe(false);
    const unticked = toggleTick(ticked, id, TODAY, TODAY);
    expect(planReminders(unticked, daily(), MORNING).some((r) => r.date === TODAY)).toBe(true);
  });

  it("never names a Habit, however the Habit is opted in", () => {
    let data = account(["antidepressants"]);
    data = setSharedName(data, idOf(data, "antidepressants"), true);
    for (const reminder of planReminders(data, daily(), MORNING)) {
      expect(`${reminder.title} ${reminder.body}`).not.toContain("antidepressants");
    }
  });
});

describe("a Reminded Habit", () => {
  function withHabitReminder(data: AppData, name: string, time = EVENING) {
    return setHabitReminder(noReminders(), idOf(data, name), time);
  }

  it("is prompted at a time of its own", () => {
    const data = account(["yoga", "meds"]);
    const settings = withHabitReminder(data, "yoga", { hour: 7, minute: 30 });
    const todays = planReminders(data, settings, MORNING).filter((r) => r.date !== TODAY);
    expect(todays[0]!.time).toEqual({ hour: 7, minute: 30 });
    // Only the opted-in Habit. "meds" is unreminded by default.
    expect(planReminders(data, settings, MORNING)).toHaveLength(HORIZON_DAYS - 1);
  });

  it("goes silent once that Habit is Ticked, and leaves the others alone", () => {
    let data = account(["yoga", "meds"]);
    let settings = withHabitReminder(data, "yoga");
    settings = setHabitReminder(settings, idOf(data, "meds"), EVENING);
    data = toggleTick(data, idOf(data, "yoga"), TODAY, TODAY);

    const todays = planReminders(data, settings, MORNING).filter((r) => r.date === TODAY);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.key).toContain(idOf(data, "meds"));
  });

  it("stops entirely while the Habit is Archived", () => {
    let data = account(["yoga"]);
    const settings = withHabitReminder(data, "yoga");
    data = setArchived(data, idOf(data, "yoga"), true, TODAY);
    expect(planReminders(data, settings, MORNING)).toEqual([]);
  });

  it("starts again when the Habit comes out of the Archive", () => {
    let data = account(["yoga"]);
    const settings = withHabitReminder(data, "yoga");
    const id = idOf(data, "yoga");
    data = setArchived(data, id, true, TODAY);
    data = setArchived(data, id, false, TODAY);
    expect(planReminders(data, settings, MORNING).length).toBeGreaterThan(0);
  });

  it("runs alongside the Daily Reminder — turn on both and you get both", () => {
    const data = account(["yoga"]);
    let settings = setDailyReminder(noReminders(), { hour: 21, minute: 0 });
    settings = setHabitReminder(settings, idOf(data, "yoga"), { hour: 10, minute: 0 });
    const todays = planReminders(data, settings, MORNING).filter((r) => r.date === TODAY);
    expect(todays.map((r) => r.key.split(":")[0])).toEqual(["habit", "daily"]);
  });
});

describe("a name on a lock screen", () => {
  it("says '1 Habit left' for a Habit that was never opted in", () => {
    const data = account(["no drinking"]);
    const settings = setHabitReminder(noReminders(), idOf(data, "no drinking"), EVENING);
    for (const reminder of planReminders(data, settings, MORNING)) {
      expect(reminder.body).toBe("1 Habit left");
      expect(reminder.title).not.toContain("drinking");
    }
  });

  it("names the Habit once it is a Named Habit", () => {
    let data = account(["yoga"]);
    const settings = setHabitReminder(noReminders(), idOf(data, "yoga"), EVENING);
    data = setSharedName(data, idOf(data, "yoga"), true);
    expect(planReminders(data, settings, MORNING)[0]!.body).toBe("yoga");
  });
});

describe("the plan the device is handed", () => {
  it("covers a horizon, so a phone left alone for a week is still prompted", () => {
    const plan = planReminders(account(["yoga"]), daily(), MORNING);
    expect(new Set(plan.map((r) => r.date)).size).toBe(HORIZON_DAYS);
    expect(plan.at(-1)!.date).toBe(addDays(TODAY, HORIZON_DAYS - 1));
  });

  it("drops today's Reminder once its time has passed", () => {
    const lateEvening = new Date(2026, 7, 3, 20, 1);
    const plan = planReminders(account(["yoga"]), daily(), lateEvening);
    expect(plan.some((r) => r.date === TODAY)).toBe(false);
    expect(plan[0]!.date).toBe(addDays(TODAY, 1));
  });

  it("does not schedule a Reminder for the minute it is already", () => {
    const onTheDot = new Date(2026, 7, 3, 20, 0);
    expect(planReminders(account(["yoga"]), daily(), onTheDot).some((r) => r.date === TODAY)).toBe(
      false,
    );
  });

  it("is sorted soonest first", () => {
    const data = account(["yoga"]);
    let settings = setDailyReminder(noReminders(), { hour: 22, minute: 0 });
    settings = setHabitReminder(settings, idOf(data, "yoga"), { hour: 10, minute: 0 });
    const plan = planReminders(data, settings, MORNING);
    const stamps = plan.map((r) => `${r.date} ${r.time.hour}`);
    expect(stamps).toEqual([...stamps].sort());
  });

  it("stays inside the device's pending limit, keeping the soonest Days", () => {
    const names = Array.from({ length: 20 }, (_, i) => `habit ${i}`);
    const data = account(names);
    let settings = daily();
    for (const name of names) settings = setHabitReminder(settings, idOf(data, name), EVENING);
    const plan = planReminders(data, settings, MORNING);
    expect(plan.length).toBe(PENDING_LIMIT);
    expect(plan[0]!.date).toBe(TODAY);
    expect(plan.at(-1)!.date).toBe(addDays(TODAY, 2));
  });

  it("gives every Reminder a key that survives a replan", () => {
    const data = account(["yoga"]);
    const first = planReminders(data, daily(), MORNING);
    const second = planReminders(data, daily(), new Date(2026, 7, 3, 9, 30));
    expect(second.map((r) => r.key)).toEqual(first.map((r) => r.key));
    expect(new Set(first.map((r) => r.key)).size).toBe(first.length);
  });

  it("defaults its clock to now", () => {
    const data = account([], toKey(new Date()));
    expect(planReminders(data, daily())).toEqual([]);
  });
});

describe("outstanding Habits", () => {
  it("are the Active ones whose Square is still empty", () => {
    let data = account(["yoga", "meds"]);
    data = toggleTick(data, idOf(data, "yoga"), TODAY, TODAY);
    expect(outstandingOn(data, TODAY).map((h) => h.name)).toEqual(["meds"]);
  });

  it("count every Active Habit on a Day still to come", () => {
    const data = account(["yoga", "meds"]);
    expect(outstandingOn(data, addDays(TODAY, 3))).toHaveLength(2);
  });
});

describe("a Reminder belongs to the device, not the record", () => {
  it("is nowhere in an Export", () => {
    const data = account(["yoga"]);
    let settings = daily();
    settings = setHabitReminder(settings, idOf(data, "yoga"), { hour: 7, minute: 15 });
    const exported = serialise(data);
    expect(exported).not.toContain("remind");
    expect(exported).not.toContain("minute");
    expect(JSON.parse(exported)).not.toHaveProperty("daily");
  });

  it("drops Reminders aimed at Habits an Import no longer has", () => {
    const data = account(["yoga"]);
    let settings = setHabitReminder(daily(), idOf(data, "yoga"), EVENING);
    settings = setHabitReminder(settings, "a habit from another phone", EVENING);
    const reconciled = reconcileReminders(settings, data.habits);
    expect(Object.keys(reconciled.habits)).toEqual([idOf(data, "yoga")]);
    // The Daily Reminder is the Day's, not a Habit's, so an Import cannot orphan it.
    expect(reconciled.daily).toEqual(EVENING);
  });

  it("leaves settings untouched when every Reminder still matches", () => {
    const data = account(["yoga"]);
    const settings = setHabitReminder(noReminders(), idOf(data, "yoga"), EVENING);
    expect(reconcileReminders(settings, data.habits)).toBe(settings);
  });

  it("survives a round trip through the device store", () => {
    let settings = daily();
    settings = setHabitReminder(settings, "h1", { hour: 7, minute: 5 });
    expect(parseReminderSettings(JSON.parse(serialiseReminders(settings)))).toEqual(settings);
  });

  it("falls back to no Reminders rather than refusing a blob it cannot read", () => {
    expect(parseReminderSettings(null)).toEqual(noReminders());
    expect(parseReminderSettings("nonsense")).toEqual(noReminders());
    expect(parseReminderSettings({ daily: { hour: 99, minute: 0 } }).daily).toBeNull();
    expect(parseReminderSettings({ habits: { h1: { hour: -1, minute: 0 } } }).habits).toEqual({});
  });
});

describe("when a Reminder is due", () => {
  it("is the hour set on that Day's local midnight", () => {
    const due = reminderAt({
      key: "daily:2026-08-03",
      date: TODAY,
      time: EVENING,
      title: "squares",
      body: "1 Habit left",
    });
    expect(toKey(due)).toBe(TODAY);
    expect([due.getHours(), due.getMinutes(), due.getSeconds()]).toEqual([20, 0, 0]);
  });

  it("is always in the future for everything the plan contains", () => {
    const now = new Date(2026, 7, 3, 19, 59);
    for (const reminder of planReminders(account(["yoga"]), daily(), now)) {
      expect(reminderAt(reminder).getTime()).toBeGreaterThan(now.getTime());
    }
  });
});
