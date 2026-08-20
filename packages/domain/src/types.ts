import type { DateKey } from "./date";

/**
 * An unbroken run of Days on which a Habit was Active.
 *
 * Half-open: `from` is the Day it was taken up and is Active; `to` is the Day it
 * was Archived and is *not*. Getting that backwards gives every Archived Habit
 * one extra Active Day.
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
   * ADR 0005: Archive is a state a Habit can leave, so it cannot be one date.
   * Taking a Habit out of the Archive opens a new Span rather than extending the
   * old one — the Days it spent Archived stay a permanent gap. Ordered, and
   * never overlapping.
   */
  spans: Span[];
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
  /** 2 since ADR 0005. A v1 file is migrated on read, never refused. */
  version: 2;
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
  return { version: 2, installedOn, habits: [], days: {}, theme: "system" };
}
