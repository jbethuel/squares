import type { DateKey } from "./date";

/** Something the user has decided to do daily and is tracking. */
export interface Habit {
  id: string;
  name: string;
  /** First Day on which this Habit was Active. */
  createdOn: DateKey;
  /**
   * Archive retires a Habit from this Day forward; it is not Active on this Day
   * or after it. History is untouched. There is no delete.
   */
  archivedOn: DateKey | null;
  /** A Chained Habit is one whose Chain the user has explicitly opted into seeing. */
  chained: boolean;
  /** A Named Habit may have its name shown on a Share Card. Off by default. */
  sharedName: boolean;
}

/**
 * The permanent record of one Day: which Habits were Active and which were
 * Ticked.
 *
 * ADR 0001: `active` is *stored*, never re-derived from the current Habit set.
 * Intensity is a proportion, and a denominator that can be edited after the
 * fact turns a patchy year green retroactively — which would make the Heatmap
 * stop being a record.
 */
export interface DayRecord {
  date: DateKey;
  active: string[];
  ticked: string[];
}

export type ThemePreference = "system" | "light" | "dark";

export interface AppData {
  version: 1;
  /** The Day the year starts counting from. */
  installedOn: DateKey;
  habits: Habit[];
  days: Record<DateKey, DayRecord>;
  theme: ThemePreference;
}

/** The shade of a Square: 0 = none, 4 = every Active Habit Ticked. */
export type Intensity = 0 | 1 | 2 | 3 | 4;

/** The Overview never shows more than a year. */
export const YEAR = 365;

/**
 * The Grace Window: the span after a Day closes during which its Squares can
 * still be Ticked. Yesterday is open; the day before is closed permanently.
 */
export const GRACE_DAYS = 1;

export function emptyData(installedOn: DateKey): AppData {
  return { version: 1, installedOn, habits: [], days: {}, theme: "system" };
}
