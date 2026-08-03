import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isDateKey, toKey, weekdayOf } from "./date";

describe("date", () => {
  it("formats a local calendar date, not a UTC one", () => {
    // 23:30 local on the 3rd is still the 3rd, whatever UTC thinks.
    expect(toKey(new Date(2026, 7, 3, 23, 30))).toBe("2026-08-03");
    expect(toKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("adds Days on the calendar, so DST cannot shift a Day", () => {
    // US spring-forward and fall-back weekends: a Day either side must still
    // land on the intended date even though one is 23 hours long.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("measures whole Days in both directions", () => {
    expect(daysBetween("2026-08-03", "2026-08-03")).toBe(0);
    expect(daysBetween("2026-08-02", "2026-08-03")).toBe(1);
    expect(daysBetween("2026-08-03", "2026-08-02")).toBe(-1);
    expect(daysBetween("2025-08-03", "2026-08-03")).toBe(365);
  });

  it("orders chronologically under plain string comparison", () => {
    expect("2026-08-03" < "2026-08-10").toBe(true);
    expect("2026-09-01" > "2026-08-31").toBe(true);
  });

  it("puts Sunday at row 0", () => {
    expect(weekdayOf("2026-08-02")).toBe(0);
    expect(weekdayOf("2026-08-03")).toBe(1);
  });

  it("rejects things that are not DateKeys", () => {
    expect(isDateKey("2026-08-03")).toBe(true);
    expect(isDateKey("2026-8-3")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey(20260803)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});
