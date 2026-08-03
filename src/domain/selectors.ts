import { addDays, daysBetween, type DateKey } from "./date";
import { GRACE_DAYS, YEAR, type AppData, type DayRecord, type Habit, type Intensity } from "./types";

/** Habits that existed and were not Archived on the given Day. */
export function activeOn(habits: Habit[], date: DateKey): string[] {
  return habits
    .filter((h) => h.createdOn <= date && (h.archivedOn === null || date < h.archivedOn))
    .map((h) => h.id);
}

export function isArchived(habit: Habit, today: DateKey): boolean {
  return habit.archivedOn !== null && habit.archivedOn <= today;
}

export function liveHabits(data: AppData, today: DateKey): Habit[] {
  return data.habits.filter((h) => !isArchived(h, today));
}

export function archivedHabits(data: AppData, today: DateKey): Habit[] {
  return data.habits.filter((h) => isArchived(h, today));
}

/**
 * The Grace Window. Today is open; yesterday is open; the Day before that is
 * closed permanently. Future Days are not open — there is nothing to record.
 */
export function isOpen(date: DateKey, today: DateKey): boolean {
  const age = daysBetween(date, today);
  return age >= 0 && age <= GRACE_DAYS;
}

/** Days on file, capped at a year. Day one counts as 1. */
export function elapsedDays(data: AppData, today: DateKey): number {
  const age = daysBetween(data.installedOn, today) + 1;
  return Math.max(1, Math.min(YEAR, age));
}

/** The DateKey `offset` Days before today. Offset 0 is today. */
export function dateAt(today: DateKey, offset: number): DateKey {
  return addDays(today, -offset);
}

export function recordAt(data: AppData, date: DateKey): DayRecord | undefined {
  return data.days[date];
}

export function isTicked(data: AppData, habitId: string, date: DateKey): boolean {
  return data.days[date]?.ticked.includes(habitId) ?? false;
}

export function wasActive(data: AppData, habitId: string, date: DateKey): boolean {
  const record = data.days[date];
  return record ? record.active.includes(habitId) : activeOn(data.habits, date).includes(habitId);
}

/**
 * Intensity: the proportion of that Day's Active Habits that were Ticked,
 * in quartiles. A full-shade Square always means a complete Day, whatever the
 * Habit count was at the time.
 */
export function intensityOf(record: DayRecord | undefined): Intensity {
  if (!record || record.active.length === 0) return 0;
  const ticked = record.ticked.filter((id) => record.active.includes(id)).length;
  if (ticked === 0) return 0;
  return Math.min(4, Math.ceil((ticked / record.active.length) * 4)) as Intensity;
}

export function intensityAt(data: AppData, date: DateKey): Intensity {
  return intensityOf(data.days[date]);
}

/** Ticks across all Habits in the last year. Only ever rises. */
export function totalTicks(data: AppData, today: DateKey): number {
  let total = 0;
  const span = elapsedDays(data, today);
  for (let offset = 0; offset < span; offset++) {
    total += data.days[dateAt(today, offset)]?.ticked.length ?? 0;
  }
  return total;
}

export function tickCountOf(data: AppData, habitId: string, today: DateKey): number {
  let total = 0;
  const span = elapsedDays(data, today);
  for (let offset = 0; offset < span; offset++) {
    if (isTicked(data, habitId, dateAt(today, offset))) total++;
  }
  return total;
}

/**
 * Strictly consecutive Days on which a Habit was Ticked, counted back from
 * today — or from yesterday, while today is still open and untapped, so that a
 * Chain is not reported broken at 00:01. A Chain is never forgiven or repaired.
 */
export function chainOf(data: AppData, habitId: string, today: DateKey): number {
  let cursor = isTicked(data, habitId, today) ? today : dateAt(today, 1);
  if (!isTicked(data, habitId, cursor)) return 0;
  let length = 0;
  while (isTicked(data, habitId, cursor)) {
    length++;
    cursor = addDays(cursor, -1);
  }
  return length;
}

export function longestChainOf(data: AppData, habitId: string, today: DateKey): number {
  let best = 0;
  let run = 0;
  const span = elapsedDays(data, today);
  for (let offset = span - 1; offset >= 0; offset--) {
    if (isTicked(data, habitId, dateAt(today, offset))) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/** Active Habits with yesterday's Square still empty, while it can still be Ticked. */
export function stillOpenYesterday(data: AppData, today: DateKey): Habit[] {
  const yesterday = dateAt(today, 1);
  if (daysBetween(data.installedOn, yesterday) < 0) return [];
  return liveHabits(data, today).filter(
    (h) => wasActive(data, h.id, yesterday) && !isTicked(data, h.id, yesterday),
  );
}
