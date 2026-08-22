import type { DateKey } from "./date";

/**
 * An unbroken run of Days on which a Habit was Active.
 *
 * Half-open: `from` is the Day it was taken up and is Active; `to` is the Day it
 * was Hidden and is *not*. Getting that backwards gives every Hidden Habit one
 * extra Active Day.
 */
export interface Span {
  from: DateKey;
  /** null while the Habit is still going. */
  to: DateKey | null;
}

/** Something the user has decided to do daily and is tracking. */
export interface Habit {
  id: string;
  name: string;
  /**
   * ADR 0003: Hide is a state a Habit can leave, so it cannot be one date.
   * Showing a Hidden Habit again opens a new Span rather than extending the old
   * one — the Days it spent Hidden stay a permanent gap. Ordered, and never
   * overlapping.
   *
   * ADR 0001: Spans are also the denominator behind every Square. They are what
   * knows a Habit was not Active on a given Day, which is what stops a Habit
   * taken up last week from re-shading the year behind it.
   */
  spans: Span[];
  /** A Streak Habit is one whose Streak the user has opted into seeing. */
  streaks: boolean;
  /** A Named Habit may have its name shown on a Share Card. Off by default. */
  sharedName: boolean;
}

/**
 * The permanent record of one Day: which Habits the user Logged.
 *
 * ADR 0001: the set of Habits that were Active is *not* stored. It is derived
 * from Spans at read time, filtered to the Habits that are not Hidden now, so
 * that Hiding a Habit takes its history out of the Overview with it.
 *
 * A Day with no Logs has no record at all — an empty one would carry nothing.
 */
export interface DayRecord {
  date: DateKey;
  logged: string[];
}

export type ThemePreference = "system" | "light" | "dark";

export interface AppData {
  /** 3 since ADR 0001 dropped the stored Active set. Older files are migrated. */
  version: 3;
  /** The Day the year starts counting from. */
  installedOn: DateKey;
  habits: Habit[];
  days: Record<DateKey, DayRecord>;
  theme: ThemePreference;
}

/** The shade of a Square: 0 = none, 4 = every counted Habit Logged. */
export type Intensity = 0 | 1 | 2 | 3 | 4;

/** The Overview never shows more than a year. */
export const YEAR = 365;

export function emptyData(installedOn: DateKey): AppData {
  return { version: 3, installedOn, habits: [], days: {}, theme: "system" };
}
