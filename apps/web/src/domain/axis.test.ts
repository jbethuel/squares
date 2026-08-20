import { describe, expect, it } from "vitest";
import { MONTH_LABEL_WIDTH, monthLabels, NAMED_WEEKDAYS, weekdayLabels } from "./axis";
import { addDays, monthLabel, weekdayOf, type DateKey } from "./date";
import { gridColumns, gridSquares, type Frame } from "./grid";
import { lensFrame } from "./lens";

/** A Monday, the 3rd of August 2026. */
const TODAY: DateKey = "2026-08-03";
const YEAR: Frame = lensFrame("year", TODAY);

/** The Year scrolls at an 11px Square and a 3px gap: 14px a column. */
const STEP = 14;

function labelsFor(frame: Frame, today: DateKey, rows = 7, step = STEP) {
  const weekday = weekdayOf(today);
  const cols = gridColumns(frame, weekday, rows);
  return monthLabels(gridSquares(cols, frame, weekday, rows), today, step);
}

describe("the weekday names beside a Heatmap", () => {
  it("names monday, wednesday and friday, and no other day", () => {
    expect(weekdayLabels()).toEqual([
      { track: 1, text: "mon" },
      { track: 3, text: "wed" },
      { track: 5, text: "fri" },
    ]);
  });

  // Sunday is row 0 of a calendar block and column 0 of the Week's single row,
  // so the same three indices place the names on either axis.
  it("uses the weekday index itself, so it places on either axis", () => {
    expect(NAMED_WEEKDAYS).toEqual([1, 3, 5]);
    expect(weekdayLabels().map((label) => label.track)).toEqual(NAMED_WEEKDAYS);
  });
});

describe("the month names above a Heatmap", () => {
  it("names a month above the first column that month owns", () => {
    const labels = labelsFor(YEAR, TODAY);
    for (const label of labels) {
      // The column's Sunday is the Day that decides which month owns it.
      const sunday = gridSquares(gridColumns(YEAR, weekdayOf(TODAY)), YEAR, weekdayOf(TODAY)).find(
        (square) => square.column === label.track && square.row === 0,
      )!;
      expect(monthLabel(addDays(TODAY, -sunday.offset))).toBe(label.text);
    }
  });

  /*
    A rolling year opens and closes in the same month, so August appears at both
    ends holding a part-month each. Here the year opens on 4 August 2025, which
    leaves August four columns at the head — enough for its name — and closes on
    3 August 2026, one column, which is not. Which end survives moves with the
    date; that a part-month is what gets dropped does not.
  */
  it("names every whole month, dropping only a part-month with no room", () => {
    expect(labelsFor(YEAR, TODAY).map((label) => label.text)).toEqual([
      "aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "jun", "jul",
    ]);
  });

  it("runs left to right in calendar order", () => {
    const labels = labelsFor(YEAR, TODAY);
    const tracks = labels.map((label) => label.track);
    expect(tracks).toEqual([...tracks].sort((a, b) => a - b));
  });

  /*
    Two columns is 28px at the scrolling Year's step, and a month name wants 23.
    A month with less room than that goes unnamed rather than printing on top of
    its neighbour — but the month after it is still recognised as a change, so
    one crowded month never swallows the next.
  */
  it("never places two names close enough to collide, whatever day it is", () => {
    for (let day = 0; day < 40; day++) {
      const today = addDays(TODAY, day);
      const labels = labelsFor(lensFrame("year", today), today);
      const gaps = labels.slice(1).map((label, index) => label.track - labels[index]!.track);
      expect(Math.min(...gaps) * STEP).toBeGreaterThanOrEqual(MONTH_LABEL_WIDTH);
      // A rolling year holds eleven whole months plus the part-month at each
      // end, and at this step both ends usually have the room to be named.
      expect(labels.length).toBeGreaterThanOrEqual(12);
      expect(labels.length).toBeLessThanOrEqual(13);
    }
  });

  /*
    The rule is in px, not columns. Squeezed to fit a phone the Year stepped
    6.14px and needed four columns for a name; scrolling it steps 14px and needs
    two. A fixed count would have been wrong for one of them.
  */
  it("scales the room it demands with how wide a column is", () => {
    for (const step of [14, 6.14, 3]) {
      const labels = labelsFor(YEAR, TODAY, 7, step);
      const gaps = labels.slice(1).map((label, index) => label.track - labels[index]!.track);
      expect(Math.min(...gaps) * step).toBeGreaterThanOrEqual(MONTH_LABEL_WIDTH);
    }
    // Narrow the column far enough and a month can no longer earn its name.
    expect(labelsFor(YEAR, TODAY, 7, 3).length).toBeLessThan(labelsFor(YEAR, TODAY).length);
  });

  /*
    Why the Month Lens does not use this function.

    A column belongs to the month its Sunday falls in, which is what a Year
    needs — the names have to agree with the columns the Squares are in. On a
    Month it lands the name in the wrong place: August 2026 opens on a Saturday,
    so column 0 is a week of July, and the name for August sits over column 1
    rather than over the grid it titles. It also has no year on it, and nothing
    else on that Screen carries one. `lensMonths` returns "month" instead, and
    the Screen draws `monthYearLabel`.
  */
  it("titles a month grid off-centre and without a year, which is why it is not asked to", () => {
    expect(labelsFor(lensFrame("month", TODAY), TODAY)).toEqual([{ track: 1, text: "aug" }]);
  });
});
