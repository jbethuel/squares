/**
 * The Lens: how much of the record a Heatmap draws.
 *
 * A Lens picks a frame — the Week, the Month or the Year — and the frame is a
 * fixed shape. The Week is always seven Squares, Sunday to Saturday. The Month
 * is always the whole month, the 1st to the 28th, 30th or 31st. The Year is
 * always 365 Squares, ending today, which is the same window the Total counts.
 *
 * A Lens changes how many Squares are drawn, and therefore how large they are.
 * It never changes what a Square means — one Square is one Day under every Lens
 * — and it never changes the Total.
 *
 * Every Day in the frame is drawn, including Days that have not happened yet
 * and Days from before the account existed. Both draw at Intensity 0, which is
 * also what a Day you simply missed draws at: the frame is a calendar, and a
 * calendar does not shrink to fit what you did with it.
 */
import { dayOfMonth, daysInMonth, weekdayOf, type DateKey } from "./date";
import { CALENDAR_ROWS, type Frame } from "./grid";
import { YEAR } from "./types";

export type Lens = "week" | "month" | "year";

/** In the order the picker offers them: shortest first, the Year as the home state. */
export const LENSES: readonly Lens[] = ["week", "month", "year"];

export const DEFAULT_LENS: Lens = "year";

/**
 * The frame a Lens draws.
 *
 * The Week and the Month are calendar-aligned, because row 0 of the grid is
 * Sunday and a week that started on a Wednesday would not line up with a single
 * column. The Year is rolling rather than 1 January to 31 December, so that it
 * agrees with the Total above it, which counts the last 365 Days.
 */
export function lensFrame(lens: Lens, today: DateKey): Frame {
  switch (lens) {
    case "week": {
      const weekday = weekdayOf(today);
      return { back: weekday + 1, ahead: 6 - weekday };
    }
    case "month": {
      const date = dayOfMonth(today);
      return { back: date, ahead: daysInMonth(today) - date };
    }
    case "year":
      return { back: YEAR, ahead: 0 };
  }
}

/**
 * Rows the Lens draws its Frame in.
 *
 * The Month and the Year are calendar blocks — a column is a week, a row is a
 * weekday — because the weekday rows lining up across columns is the whole
 * reason the shape reads. The Week has no second column to line up with, so it
 * is one row, Sunday to Saturday, left to right: seven Squares at the size the
 * width allows rather than a vertical strip that reads as nothing.
 */
export function lensRows(lens: Lens): number {
  return lens === "week" ? 1 : CALENDAR_ROWS;
}

/**
 * What the strip above a Heatmap carries under this Lens.
 *
 * The Year gets a run of month names, one above the column each month begins
 * in. The Month gets a single name, carrying its year because nothing else on
 * the Screen says which one. The Week gets neither — its own strip is the three
 * weekday names, which have no side to sit on when the Frame is a single row.
 */
export type MonthAxis = "none" | "month" | "months";

export function lensMonths(lens: Lens): MonthAxis {
  switch (lens) {
    case "week":
      return "none";
    case "month":
      return "month";
    case "year":
      return "months";
  }
}

/**
 * Whether the Lens draws a Frame too long to fit, and scrolls instead.
 *
 * Only the Year. A Week is seven Squares and a Month is five columns; both sit
 * on a phone at the largest size the app draws. A Year is 53 columns, and
 * fitting those to a phone costs a Square most of its size.
 */
export function lensScrolls(lens: Lens): boolean {
  return lens === "year";
}

/** Squares a Lens draws: 7, 28-31, or 365. */
export function lensDays(lens: Lens, today: DateKey): number {
  const frame = lensFrame(lens, today);
  return frame.back + frame.ahead;
}

/** "the week" · "the month" · "the year", for prose that names what is drawn. */
export function lensNoun(lens: Lens): string {
  return `the ${lens}`;
}

export interface LensLegend {
  /** The Day the grid starts at, under its left edge. */
  start: string;
  /** What lies between the two edges, or empty where the edges already say it. */
  note: string;
  /** The Day the grid ends at, under its right edge. */
  end: string;
}

/**
 * The three cells of the legend under the grid, or null where the names above
 * it already say the same thing.
 *
 * Only the Week has one now. The Year names its months across the top and the
 * Month names itself, so a second line underneath answering "where does this
 * start" would be restating what is already on screen. The Week's strip carries
 * `mon wed fri`, which never says that the row runs Sunday to Saturday — so
 * that is the one legend left, and it names both ends.
 */
export function lensLegend(lens: Lens): LensLegend | null {
  return lens === "week" ? { start: "sunday", note: "this week", end: "saturday" } : null;
}
