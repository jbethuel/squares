/**
 * A Day is a local calendar date, midnight to midnight, resolved at the moment
 * of the Log and never recomputed. It is stored as `YYYY-MM-DD` so that string
 * comparison is chronological comparison, and so that a record written in one
 * timezone still names the Day the user was actually living in.
 */
export type DateKey = string;

const KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === "string" && KEY.test(value) && !Number.isNaN(Date.parse(value));
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** The local calendar date the given instant falls on. */
export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight at the start of the Day. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

/**
 * Days are added on the local calendar, not by adding 86400 seconds, so a Day
 * either side of a DST boundary still lands on the intended date.
 */
export function addDays(key: DateKey, delta: number): DateKey {
  const date = fromKey(key);
  date.setDate(date.getDate() + delta);
  return toKey(date);
}

/** Whole Days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DateKey, to: DateKey): number {
  const a = fromKey(from);
  const b = fromKey(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/** 0 = Sunday, matching the row order of the Heatmap. */
export function weekdayOf(key: DateKey): number {
  return fromKey(key).getDay();
}

/** The Day of the month, 1-31. */
export function dayOfMonth(key: DateKey): number {
  return fromKey(key).getDate();
}

/** Days in the calendar month this Day falls in: 28, 29, 30 or 31. */
export function daysInMonth(key: DateKey): number {
  const date = fromKey(key);
  // Day 0 of the next month is the last Day of this one.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** "aug" — the strip above a Heatmap, where the year is carried by the grid. */
export function monthLabel(key: DateKey): string {
  return MONTHS[fromKey(key).getMonth()]!;
}

export function monthYearLabel(key: DateKey): string {
  const date = fromKey(key);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "1 aug" — an edge of a Heatmap, where the year is already understood. */
export function dayMonthLabel(key: DateKey): string {
  const date = fromKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function longLabel(key: DateKey): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
