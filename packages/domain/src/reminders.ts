import { addDays, fromKey, toKey, type DateKey } from "./date";
import { isTicked, wasActive } from "./selectors";
import type { AppData, Habit } from "./types";

/**
 * The rules a Reminder follows. The scheduling itself is the phone's job and
 * lives in `apps/mobile/src/platform` — ADR 0007 says the web build has no
 * Reminder and cannot have one.
 *
 * This is here anyway rather than in the app, because what a Reminder *says* is
 * the one place a Habit name can reach a lock screen, and that rule has to be
 * testable. The app has no test runner; this package does.
 */

/** A time the user picked, on the local clock. */
export interface TimeOfDay {
  /** 0-23. */
  hour: number;
  /** 0-59. */
  minute: number;
}

/**
 * Which Reminders are set on *this device*.
 *
 * ADR 0007: a Reminder belongs to the device and not to the record, so this is
 * deliberately not part of `AppData`. It is stored under its own key, it is not
 * in an Export, and a record carried to another phone arrives with none set.
 *
 * Off is absence, not a flag: `daily: null` and an id missing from `habits` are
 * the only ways to be off, so there is no boolean that can disagree with a time.
 */
export interface ReminderSettings {
  version: 1;
  /** The Daily Reminder: one a day, at a time the user picks. Off by default. */
  daily: TimeOfDay | null;
  /** Reminded Habits, by Habit id, each at a time of its own. Unreminded by default. */
  habits: Record<string, TimeOfDay>;
}

export function noReminders(): ReminderSettings {
  return { version: 1, daily: null, habits: {} };
}

/**
 * How far ahead Reminders are scheduled.
 *
 * The record only changes while the app is open, so every Tick can replan — but
 * a phone left alone for a week must still be prompted, which is the whole point
 * of the feature. Seven Days is the horizon that survives not opening the app.
 */
export const HORIZON_DAYS = 7;

/**
 * The most pending notifications to hand the device at once.
 *
 * iOS keeps 64 pending local notifications and silently drops the rest. The
 * plan is sorted soonest-first and truncated here, so what gets dropped is the
 * far end of the horizon rather than tomorrow morning.
 */
export const PENDING_LIMIT = 60;

/** Never the Habit's name. A title is the largest text on a lock screen. */
const TITLE = "squares";

export function isTimeOfDay(value: unknown): value is TimeOfDay {
  if (typeof value !== "object" || value === null) return false;
  const { hour, minute } = value as Partial<TimeOfDay>;
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour! >= 0 &&
    hour! <= 23 &&
    minute! >= 0 &&
    minute! <= 59
  );
}

/** Minutes since local midnight — what "has that time passed yet" compares. */
export function minutesInto(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

export function timeOfDay(now: Date): TimeOfDay {
  return { hour: now.getHours(), minute: now.getMinutes() };
}

export function reminderFor(settings: ReminderSettings, habitId: string): TimeOfDay | null {
  return settings.habits[habitId] ?? null;
}

export function setDailyReminder(
  settings: ReminderSettings,
  time: TimeOfDay | null,
): ReminderSettings {
  if (time !== null && !isTimeOfDay(time)) return settings;
  return { ...settings, daily: time };
}

export function setHabitReminder(
  settings: ReminderSettings,
  habitId: string,
  time: TimeOfDay | null,
): ReminderSettings {
  if (time !== null && !isTimeOfDay(time)) return settings;
  const habits = { ...settings.habits };
  if (time === null) delete habits[habitId];
  else habits[habitId] = time;
  return { ...settings, habits };
}

/**
 * Drop Reminders pointing at Habits that no longer exist.
 *
 * ADR 0007: Reminder times are keyed by Habit id on the device while the record
 * is not, so a record replaced by Import can leave Reminders aimed at nothing.
 * Run this after any Import.
 */
export function reconcileReminders(
  settings: ReminderSettings,
  habits: Habit[],
): ReminderSettings {
  const ids = new Set(habits.map((h) => h.id));
  const kept = Object.entries(settings.habits).filter(([id]) => ids.has(id));
  if (kept.length === Object.keys(settings.habits).length) return settings;
  return { ...settings, habits: Object.fromEntries(kept) };
}

/**
 * Active Habits on that Day whose Square is still empty.
 *
 * This one predicate is the whole of both silence rules. An Archived Habit is
 * not Active, so it drops out; a Ticked Habit drops out; a Day whose Active
 * Habits were all Ticked yields nothing at all. A Day still to come has no Day
 * Record, so every Habit Active on it is outstanding — which is what it is,
 * at the moment the plan is made.
 */
export function outstandingOn(data: AppData, date: DateKey): Habit[] {
  return data.habits.filter(
    (habit) => wasActive(data, habit.id, date) && !isTicked(data, habit.id, date),
  );
}

/** One notification the device should have pending. */
export interface PlannedReminder {
  /**
   * Stable across replans, so the platform can diff what it has pending against
   * a new plan instead of cancelling everything and rescheduling.
   */
  key: string;
  date: DateKey;
  time: TimeOfDay;
  title: string;
  body: string;
}

function dailyBody(count: number): string {
  return count === 1 ? "1 Habit left" : `${count} Habits left`;
}

/**
 * ADR 0007: a Reminder names its Habit only if that Habit is a Named Habit.
 * Otherwise it says what the anonymous Share Card says — a count and nothing
 * else. The default is unnamed, and a Reminder arrives unbidden in front of
 * whoever is in the room.
 */
function habitBody(habit: Habit): string {
  return habit.sharedName ? habit.name : "1 Habit left";
}

function when(reminder: PlannedReminder): string {
  return `${reminder.date} ${String(minutesInto(reminder.time)).padStart(4, "0")} ${reminder.key}`;
}

/**
 * Every Reminder the device should have pending, soonest first.
 *
 * A repeating daily trigger cannot be silenced for one Day, and both Reminders
 * are defined by being silent on the Days the work is already done. So the plan
 * is dated one-shots over a horizon, recomputed after every Tick and every time
 * the app comes forward, and reconciled against what the device actually holds.
 *
 * `now` rather than a DateKey because "has that time already passed today" is
 * the one question in this package that a Day cannot answer.
 */
export function planReminders(
  data: AppData,
  settings: ReminderSettings,
  now: Date = new Date(),
  horizon: number = HORIZON_DAYS,
): PlannedReminder[] {
  const today = toKey(now);
  const passed = minutesInto(timeOfDay(now));
  const planned: PlannedReminder[] = [];

  for (let offset = 0; offset < horizon; offset++) {
    const date = addDays(today, offset);
    // Today's Reminder is only worth scheduling if its time is still ahead.
    const stillAhead = (time: TimeOfDay) => offset > 0 || minutesInto(time) > passed;
    const outstanding = outstandingOn(data, date);
    if (outstanding.length === 0) continue;

    if (settings.daily && stillAhead(settings.daily)) {
      planned.push({
        key: `daily:${date}`,
        date,
        time: settings.daily,
        title: TITLE,
        body: dailyBody(outstanding.length),
      });
    }

    for (const habit of outstanding) {
      const time = settings.habits[habit.id];
      if (!time || !stillAhead(time)) continue;
      planned.push({
        key: `habit:${habit.id}:${date}`,
        date,
        time,
        title: TITLE,
        body: habitBody(habit),
      });
    }
  }

  planned.sort((a, b) => when(a).localeCompare(when(b)));
  return planned.slice(0, PENDING_LIMIT);
}

/**
 * The instant a planned Reminder is due, on the local clock.
 *
 * Local midnight and then the hour set on it, rather than any arithmetic on
 * epoch milliseconds: a Day is a local calendar date, so a Reminder set for 20:00
 * is due at 20:00 on that date whatever the offset did in between.
 */
export function reminderAt(reminder: PlannedReminder): Date {
  const due = fromKey(reminder.date);
  due.setHours(reminder.time.hour, reminder.time.minute, 0, 0);
  return due;
}

/**
 * The device's own slot, deliberately not `squares.v1`.
 *
 * Reminders are read and written beside the record, never inside it. A separate
 * key is what makes ADR 0007's rule structural rather than a promise: `serialise`
 * cannot carry a Reminder into an Export because it never sees one.
 */
export const REMINDERS_KEY = "squares.reminders.v1";

function parseTime(value: unknown): TimeOfDay | null {
  if (typeof value !== "object" || value === null) return null;
  const { hour, minute } = value as Record<string, unknown>;
  const time = { hour: Number(hour), minute: Number(minute) };
  return isTimeOfDay(time) ? time : null;
}

/**
 * Read the device's Reminders, falling back to none.
 *
 * Where `parseAppData` refuses a blob it cannot read — a rejected Export is a
 * destroyed backup — this one never refuses. There is no backup of a Reminder
 * to lose, and the worst case of a bad blob is a user who has to set the time
 * again. Taking the app down over an alarm clock would be the wrong trade.
 */
export function parseReminderSettings(value: unknown): ReminderSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return noReminders();
  const raw = value as Record<string, unknown>;
  const habits: Record<string, TimeOfDay> = {};
  const byHabit = raw.habits;
  if (typeof byHabit === "object" && byHabit !== null && !Array.isArray(byHabit)) {
    for (const [id, entry] of Object.entries(byHabit as Record<string, unknown>)) {
      const time = parseTime(entry);
      if (id && time) habits[id] = time;
    }
  }
  return { version: 1, daily: parseTime(raw.daily), habits };
}

export function serialiseReminders(settings: ReminderSettings): string {
  return JSON.stringify(settings);
}
