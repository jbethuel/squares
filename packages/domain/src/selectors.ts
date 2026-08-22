import { addDays, daysBetween, type DateKey } from "./date";
import { YEAR, type AppData, type DayRecord, type Habit, type Intensity } from "./types";

/** Whether the Day falls inside one of the Habit's Active Spans. */
export function isActiveOn(habit: Habit, date: DateKey): boolean {
  return habit.spans.some((span) => span.from <= date && (span.to === null || date < span.to));
}

/** Habits that were Active on the given Day, whether or not they are Hidden now. */
export function activeOn(habits: Habit[], date: DateKey): string[] {
  return habits.filter((h) => isActiveOn(h, date)).map((h) => h.id);
}

/**
 * Hidden is simply "not Active today". There is no separate flag to fall out of
 * step with the Spans, and a Habit the user brings back stops being Hidden the
 * moment its new Span opens.
 */
export function isHidden(habit: Habit, today: DateKey): boolean {
  return !isActiveOn(habit, today);
}

/** The first Day this Habit was ever Active. Survives Hiding. */
export function firstDayOf(habit: Habit): DateKey | undefined {
  return habit.spans[0]?.from;
}

export function visibleHabits(data: AppData, today: DateKey): Habit[] {
  return data.habits.filter((h) => !isHidden(h, today));
}

export function hiddenHabits(data: AppData, today: DateKey): Habit[] {
  return data.habits.filter((h) => isHidden(h, today));
}

/**
 * ADR 0002: a Log lands on today or nowhere. There is no window back into
 * yesterday, and a Day still to come has nothing to record.
 */
export function isToday(date: DateKey, today: DateKey): boolean {
  return date === today;
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

export function isLogged(data: AppData, habitId: string, date: DateKey): boolean {
  return data.days[date]?.logged.includes(habitId) ?? false;
}

/** Whether the Habit was Active on that Day, Hidden or not. */
export function wasActive(data: AppData, habitId: string, date: DateKey): boolean {
  const habit = data.habits.find((h) => h.id === habitId);
  return habit ? isActiveOn(habit, date) : false;
}

/**
 * ADR 0001: the Habits a Square counts. Active on that Day *and* not Hidden
 * now — the first half is what stops a Habit taken up last week from darkening
 * the year behind it, the second is what makes Hide mean what it says.
 */
export function countedOn(data: AppData, date: DateKey, today: DateKey): string[] {
  return data.habits
    .filter((h) => !isHidden(h, today) && isActiveOn(h, date))
    .map((h) => h.id);
}

/**
 * Intensity: the proportion of that Day's counted Habits that were Logged, in
 * quartiles. A full-shade Square always means a complete Day, whatever the
 * Habit count was at the time.
 */
export function intensityAt(data: AppData, date: DateKey, today: DateKey): Intensity {
  const counted = countedOn(data, date, today);
  if (counted.length === 0) return 0;
  const record = data.days[date];
  if (!record) return 0;
  const logged = record.logged.filter((id) => counted.includes(id)).length;
  if (logged === 0) return 0;
  return Math.min(4, Math.ceil((logged / counted.length) * 4)) as Intensity;
}

/**
 * Logs across the visible Habits over the last `days` Days, today counting as 1.
 *
 * The span is passed in rather than assumed so that a Heatmap drawn under a
 * shorter Lens can describe itself with a count of the Days it actually
 * contains. The Total on Home is not one of those: it is always the year's.
 */
export function totalLogsIn(data: AppData, today: DateKey, days: number): number {
  const visible = new Set(visibleHabits(data, today).map((h) => h.id));
  let total = 0;
  for (let offset = 0; offset < days; offset++) {
    const record = data.days[dateAt(today, offset)];
    if (!record) continue;
    total += record.logged.filter((id) => visible.has(id)).length;
  }
  return total;
}

/**
 * Logs across the visible Habits in the last year.
 *
 * ADR 0001: this falls when a Habit is Hidden. A number sitting under a Heatmap
 * has to agree with the Heatmap.
 */
export function totalLogs(data: AppData, today: DateKey): number {
  return totalLogsIn(data, today, elapsedDays(data, today));
}

export function logCountIn(
  data: AppData,
  habitId: string,
  today: DateKey,
  days: number,
): number {
  let total = 0;
  for (let offset = 0; offset < days; offset++) {
    if (isLogged(data, habitId, dateAt(today, offset))) total++;
  }
  return total;
}

export function logCountOf(data: AppData, habitId: string, today: DateKey): number {
  return logCountIn(data, habitId, today, elapsedDays(data, today));
}

/**
 * Strictly consecutive Days on which a Habit was Logged, counted back from
 * today — or from yesterday, while today is still unlogged, because today is
 * not a skipped Day until today ends. A Streak is never forgiven or repaired.
 */
export function streakOf(data: AppData, habitId: string, today: DateKey): number {
  let cursor = isLogged(data, habitId, today) ? today : dateAt(today, 1);
  if (!isLogged(data, habitId, cursor)) return 0;
  let length = 0;
  while (isLogged(data, habitId, cursor)) {
    length++;
    cursor = addDays(cursor, -1);
  }
  return length;
}

/** The longest Streak this Habit has ever held. Unlike a Streak it cannot fall. */
export function longestStreakOf(data: AppData, habitId: string, today: DateKey): number {
  let best = 0;
  let run = 0;
  const span = elapsedDays(data, today);
  for (let offset = span - 1; offset >= 0; offset--) {
    if (isLogged(data, habitId, dateAt(today, offset))) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
