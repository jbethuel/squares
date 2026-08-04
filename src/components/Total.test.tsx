import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Total } from "./Total";

const shown = () => document.querySelector(".total")!.textContent;
const rolling = () => Array.from(document.querySelectorAll(".total .digit")).map((d) => d.textContent);

describe("the Total", () => {
  it("shows the number it is given, straight away, on first paint", () => {
    render(<Total value={412} />);
    expect(shown()).toBe("412");
    // Nothing rolls on arrival; there is no previous number to have come from.
    expect(rolling()).toEqual([]);
  });

  it("rolls in behind the Square that caused it, rather than with it", async () => {
    const { rerender } = render(<Total value={9} />);
    rerender(<Total value={10} />);
    // The Tick reads as cause and the number as consequence.
    expect(shown()).toBe("9");
    await vi.waitFor(() => expect(shown()).toBe("10"), { timeout: 1000 });
  });

  it("animates only the digits that actually changed", async () => {
    const { rerender } = render(<Total value={412} />);
    rerender(<Total value={413} />);
    await vi.waitFor(() => expect(shown()).toBe("413"));
    // The units digit moved; the hundreds and tens are steady columns and are
    // not re-animated just because the number as a whole rose.
    expect(rolling()).toEqual(["3"]);
  });

  it("animates every digit a carry actually disturbs", async () => {
    const { rerender } = render(<Total value={19} />);
    rerender(<Total value={20} />);
    await vi.waitFor(() => expect(shown()).toBe("20"));
    expect(rolling()).toEqual(["2", "0"]);
  });

  it("gains a column without pretending the new digit rolled into place", async () => {
    const { rerender } = render(<Total value={9} />);
    rerender(<Total value={10} />);
    await vi.waitFor(() => expect(shown()).toBe("10"));
    // The leading 1 had no predecessor in that column, so only the units roll.
    expect(rolling()).toEqual(["0"]);
  });

  it("counts up from zero on an account that has never Ticked", () => {
    render(<Total value={0} />);
    expect(shown()).toBe("0");
  });
});
