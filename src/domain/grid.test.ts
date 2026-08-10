import { describe, expect, it } from "vitest";
import { frameDays, gridColumns, gridGeometry, gridSquares, MAX_SQUARE, type Frame } from "./grid";

const PHONE = 350;
/** A Wednesday, so a Square's row is predictable. */
const WEEKDAY = 3;

/** The three frames the app actually draws, on a Wednesday the 10th of a 31-day month. */
const WEEK: Frame = { back: WEEKDAY + 1, ahead: 6 - WEEKDAY };
const MONTH: Frame = { back: 10, ahead: 21 };
const YEAR: Frame = { back: 365, ahead: 0 };

describe("grid geometry", () => {
  it("gives a week a single column of 40px Squares", () => {
    expect(gridColumns(WEEK, WEEKDAY)).toBe(1);
    expect(gridGeometry(PHONE, WEEK, WEEKDAY).size).toBe(MAX_SQUARE);
  });

  it("fits a year on a phone with no scrolling", () => {
    const g = gridGeometry(PHONE, YEAR, WEEKDAY);
    expect(g.cols).toBe(53);
    // The design's headline number: 53 columns of ~5.4px with a 1.2px gap.
    expect(g.size).toBeCloseTo(5.43, 1);
    expect(g.gap).toBe(1.2);
    expect(g.cols * g.size + (g.cols - 1) * g.gap).toBeLessThanOrEqual(PHONE + 0.01);
  });

  it("gives a month the weeks it spans, whatever weekday it opens on", () => {
    // 31 Days from a Wednesday the 10th run to a Friday, so five weeks touch it.
    expect(gridColumns(MONTH, WEEKDAY)).toBe(5);
    // February in a common year, opening so that it fills exactly four weeks.
    expect(gridColumns({ back: 4, ahead: 24 }, 3)).toBe(4);
  });

  it("always fills the width it is given, at any frame", () => {
    for (const frame of [WEEK, MONTH, YEAR, { back: 1, ahead: 0 }]) {
      const g = gridGeometry(PHONE, frame, WEEKDAY);
      const used = g.cols * g.size + (g.cols - 1) * g.gap;
      // A short frame stops short of the width only because Squares are capped
      // at 40px; past that cap it fills the container exactly.
      if (g.size < MAX_SQUARE) expect(used).toBeCloseTo(PHONE, 5);
      expect(used).toBeLessThanOrEqual(PHONE + 0.01);
    }
  });

  it("scales the same component up to a desktop container", () => {
    const desktop = gridGeometry(660, YEAR, WEEKDAY);
    const phone = gridGeometry(PHONE, YEAR, WEEKDAY);
    expect(desktop.cols).toBe(phone.cols);
    expect(desktop.size).toBeGreaterThan(phone.size * 1.8);
    expect(desktop.size).toBeCloseTo(10.5, 1);
  });

  it("is the same 53 columns for a year whatever weekday today is", () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      expect(gridColumns(YEAR, weekday)).toBe(53);
    }
  });

  it("is one column for a week whatever weekday today is", () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      const week: Frame = { back: weekday + 1, ahead: 6 - weekday };
      expect(frameDays(week)).toBe(7);
      expect(gridColumns(week, weekday)).toBe(1);
    }
  });
});

describe("grid squares", () => {
  const drawn = (frame: Frame, weekday: number) =>
    gridSquares(gridColumns(frame, weekday), frame, weekday).filter((s) => s.kind === "framed");

  it("draws every Day the frame covers, and no more", () => {
    expect(drawn(WEEK, WEEKDAY)).toHaveLength(7);
    expect(drawn(MONTH, WEEKDAY)).toHaveLength(31);
    expect(drawn(YEAR, WEEKDAY)).toHaveLength(365);
  });

  it("puts today at its own weekday row, under every frame", () => {
    for (const frame of [WEEK, MONTH, YEAR]) {
      const squares = gridSquares(gridColumns(frame, WEEKDAY), frame, WEEKDAY);
      const today = squares.find((s) => s.offset === 0);
      expect(today?.row).toBe(WEEKDAY);
      expect(today?.kind).toBe("framed");
    }
  });

  it("runs a week from Sunday to Saturday in one column, today in the middle", () => {
    const squares = gridSquares(1, WEEK, WEEKDAY);
    expect(squares).toHaveLength(7);
    expect(squares.every((s) => s.kind === "framed")).toBe(true);
    // Row 0 is Sunday, three Days back; row 6 is Saturday, three Days on.
    expect(squares[0]?.offset).toBe(3);
    expect(squares[6]?.offset).toBe(-3);
  });

  it("draws nothing for what spills past either end of the frame", () => {
    // A year ends at today, so the remainder of the current week spills out of
    // it — and is not drawn, any more than the Days before the frame begins.
    const squares = gridSquares(gridColumns(YEAR, WEEKDAY), YEAR, WEEKDAY);
    expect(squares).toHaveLength(53 * 7);
    const pad = squares.filter((s) => s.kind === "pad");
    expect(pad).toHaveLength(53 * 7 - 365);
    expect(pad.filter((s) => s.offset < 0)).toHaveLength(3);
  });

  it("pads a month at both ends without drawing the neighbouring months", () => {
    const squares = gridSquares(gridColumns(MONTH, WEEKDAY), MONTH, WEEKDAY);
    expect(squares).toHaveLength(5 * 7);
    // Everything outside the month is padding, at either end.
    const pad = squares.filter((s) => s.kind === "pad");
    expect(pad).toHaveLength(5 * 7 - 31);
    expect(pad.every((s) => s.offset >= MONTH.back || s.offset < -MONTH.ahead)).toBe(true);
  });

  it("orders Squares oldest column first, so DOM order is calendar order", () => {
    const squares = gridSquares(gridColumns(YEAR, WEEKDAY), YEAR, WEEKDAY);
    const framed = squares.filter((s) => s.kind === "framed").map((s) => s.offset);
    expect(framed[0]).toBe(364);
    expect(framed[framed.length - 1]).toBe(0);
  });
});
