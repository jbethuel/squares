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
import {
  addDays,
  dayMonthLabel,
  dayOfMonth,
  daysInMonth,
  monthYearLabel,
  weekdayOf,
  type DateKey,
} from "./date";
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
 * The three cells of the legend under the grid. Both edges are named, because
 * under the Week and the Month the right edge is no longer today — the frame
 * runs on past it to the end of the period.
 *
 * The middle cell only earns its place under the Month, where it carries the
 * year that neither edge has. Under the Year the edges already read "aug 2025"
 * and "today", so a note between them would restate them, and it is empty.
 */
export function lensLegend(lens: Lens, today: DateKey): LensLegend {
  const frame = lensFrame(lens, today);
  const first = addDays(today, -(frame.back - 1));
  const last = addDays(today, frame.ahead);
  switch (lens) {
    case "week":
      return { start: "sunday", note: "this week", end: "saturday" };
    case "month":
      return {
        start: dayMonthLabel(first),
        note: monthYearLabel(today),
        end: dayMonthLabel(last),
      };
    case "year":
      return { start: monthYearLabel(first), note: "", end: "today" };
  }
}
