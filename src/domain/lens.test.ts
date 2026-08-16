import { describe, expect, it } from "vitest";
import { weekdayOf, type DateKey } from "./date";
import { frameDays, gridColumns, gridGeometry, gridSquares, MAX_SQUARE } from "./grid";
import { lensDays, lensFrame, lensLegend, LENSES, lensMonths, lensNoun } from "./lens";

/** A Monday, the 3rd of August 2026 — a 31-day month. */
const TODAY: DateKey = "2026-08-03";
/** A Sunday: the first Day of its week. */
const SUNDAY: DateKey = "2026-08-02";
/** The last Day of a 30-day month, and a Wednesday. */
const MONTH_END: DateKey = "2026-09-30";

const PHONE = 350;

describe("the frame a Lens draws", () => {
  it("is always a whole week, a whole month, or 365 Days", () => {
    expect(lensDays("week", TODAY)).toBe(7);
    expect(lensDays("month", TODAY)).toBe(31);
    expect(lensDays("year", TODAY)).toBe(365);
  });

  it("does not shrink to fit what has been lived", () => {
    // There is no account age here at all: the frame is a calendar, and the
    // same one whether this is day one or year one.
    expect(lensDays("year", SUNDAY)).toBe(365);
    expect(frameDays(lensFrame("week", SUNDAY))).toBe(7);
  });

  it("runs the week from Sunday to Saturday, wherever today falls in it", () => {
    expect(lensFrame("week", TODAY)).toEqual({ back: 2, ahead: 5 });
    expect(lensFrame("week", SUNDAY)).toEqual({ back: 1, ahead: 6 });
    // A Saturday is the last Day of its week: nothing ahead.
    expect(lensFrame("week", "2026-08-08")).toEqual({ back: 7, ahead: 0 });
  });

  it("runs the month from the 1st to the last, however long the month is", () => {
    expect(lensFrame("month", TODAY)).toEqual({ back: 3, ahead: 28 });
    expect(lensFrame("month", MONTH_END)).toEqual({ back: 30, ahead: 0 });
    // February, common year and leap year.
    expect(lensDays("month", "2026-02-10")).toBe(28);
    expect(lensDays("month", "2028-02-10")).toBe(29);
  });

  it("ends the year at today, so it agrees with the Total above it", () => {
    expect(lensFrame("year", TODAY)).toEqual({ back: 365, ahead: 0 });
  });

  it("names what it draws", () => {
    expect(LENSES.map(lensNoun)).toEqual(["the week", "the month", "the year"]);
  });
});

describe("the Lens and the grid", () => {
  /*
   * The point of the whole feature: a Lens is only a frame, so the same
   * geometry that fits a year on a phone gives the week 40px Squares with no
   * second layout.
   */
  it("draws the week as one column of the largest Squares the app has", () => {
    const frame = lensFrame("week", TODAY);
    const geometry = gridGeometry(PHONE, frame, weekdayOf(TODAY));
    expect(geometry.cols).toBe(1);
    expect(geometry.size).toBe(MAX_SQUARE);
  });

  it("draws every Day of the frame, including the ones still to come", () => {
    const weekday = weekdayOf(TODAY);
    for (const lens of LENSES) {
      const frame = lensFrame(lens, TODAY);
      const squares = gridSquares(gridColumns(frame, weekday), frame, weekday);
      expect(squares.filter((s) => s.kind === "framed")).toHaveLength(lensDays(lens, TODAY));
    }
  });

  it("keeps today on its own weekday row under every Lens", () => {
    const weekday = weekdayOf(TODAY);
    for (const lens of LENSES) {
      const frame = lensFrame(lens, TODAY);
      const today = gridSquares(gridColumns(frame, weekday), frame, weekday).find(
        (s) => s.offset === 0,
      );
      expect(today?.row).toBe(weekday);
    }
  });

  it("grows the grid as the Lens lengthens, and never the other way", () => {
    const drawn = LENSES.map((lens) => lensDays(lens, TODAY));
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b));
  });
});

describe("what the legend says under each Lens", () => {
  // The Week's row is the one Frame whose ends nothing else names. Its strip
  // carries `mon wed fri`, which never says the row runs Sunday to Saturday.
  it("names both ends of the week, which its weekday names do not", () => {
    expect(lensLegend("week")).toEqual({
      start: "sunday",
      note: "this week",
      end: "saturday",
    });
  });

  // The Year names its months across the top and the Month names itself, so a
  // second line underneath restates what is already on screen.
  it("is silent under the Lenses that name themselves above the grid", () => {
    expect(lensLegend("month")).toBeNull();
    expect(lensLegend("year")).toBeNull();
  });
});

describe("what the strip above the grid carries", () => {
  it("gives the year its months, the month its own name, the week neither", () => {
    expect(lensMonths("year")).toBe("months");
    expect(lensMonths("month")).toBe("month");
    // The Week's strip is its weekday names, which have no side to sit on once
    // the Frame is a single row.
    expect(lensMonths("week")).toBe("none");
  });
});
