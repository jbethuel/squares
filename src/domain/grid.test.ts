import { describe, expect, it } from "vitest";
import { gridGeometry, gridSquares, MAX_SQUARE } from "./grid";

const PHONE = 350;

describe("grid geometry", () => {
  it("gives day one a single column of 40px Squares", () => {
    const g = gridGeometry(PHONE, 1, 3);
    expect(g.cols).toBe(1);
    expect(g.size).toBe(MAX_SQUARE);
  });

  it("fits a settled year on a phone with no scrolling", () => {
    const g = gridGeometry(PHONE, 365, 3);
    expect(g.cols).toBe(53);
    // The design's headline number: 53 columns of ~5.4px with a 1.2px gap.
    expect(g.size).toBeCloseTo(5.43, 1);
    expect(g.gap).toBe(1.2);
    expect(g.cols * g.size + (g.cols - 1) * g.gap).toBeLessThanOrEqual(PHONE + 0.01);
  });

  it("always fills the width it is given, at any age", () => {
    for (const elapsed of [1, 11, 76, 200, 365]) {
      const g = gridGeometry(PHONE, elapsed, 3);
      const used = g.cols * g.size + (g.cols - 1) * g.gap;
      // The young grid stops short of the width only because Squares are
      // capped at 40px; past that cap it fills the container exactly.
      if (g.size < MAX_SQUARE) expect(used).toBeCloseTo(PHONE, 5);
      expect(used).toBeLessThanOrEqual(PHONE + 0.01);
    }
  });

  it("scales the same component up to a desktop container", () => {
    const desktop = gridGeometry(660, 365, 3);
    const phone = gridGeometry(PHONE, 365, 3);
    expect(desktop.cols).toBe(phone.cols);
    expect(desktop.size).toBeGreaterThan(phone.size * 1.8);
    expect(desktop.size).toBeCloseTo(10.5, 1);
  });

  it("widens by one column a week", () => {
    const weekday = 3;
    expect(gridGeometry(PHONE, 1, weekday).cols).toBe(1);
    expect(gridGeometry(PHONE, 4, weekday).cols).toBe(1);
    expect(gridGeometry(PHONE, 5, weekday).cols).toBe(2);
    expect(gridGeometry(PHONE, 11, weekday).cols).toBe(2);
    expect(gridGeometry(PHONE, 76, weekday).cols).toBe(12);
  });
});

describe("grid squares", () => {
  it("puts today at the weekday row of the last column", () => {
    const weekday = 3;
    const squares = gridSquares(gridGeometry(PHONE, 365, weekday).cols, 365, weekday);
    const today = squares.find((s) => s.offset === 0);
    expect(today).toBeDefined();
    expect(today!.row).toBe(weekday);
    expect(today!.column).toBe(52);
  });

  it("ghosts the rest of the current week and draws nothing before day one", () => {
    const weekday = 3;
    const squares = gridSquares(1, 1, weekday);
    expect(squares.filter((s) => s.kind === "lived")).toHaveLength(1);
    // Thursday to Saturday have not happened yet.
    expect(squares.filter((s) => s.kind === "future")).toHaveLength(3);
    // Sunday to Tuesday pre-date the account, so they are not drawn at all.
    expect(squares.filter((s) => s.kind === "unborn")).toHaveLength(3);
  });

  it("never marks a Day before the account existed as lived", () => {
    const weekday = 5;
    const elapsed = 40;
    const { cols } = gridGeometry(PHONE, elapsed, weekday);
    const squares = gridSquares(cols, elapsed, weekday);
    expect(squares.filter((s) => s.kind === "lived")).toHaveLength(elapsed);
    expect(squares.every((s) => s.kind !== "lived" || s.offset < elapsed)).toBe(true);
  });
});
