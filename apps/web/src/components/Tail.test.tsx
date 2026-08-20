import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tail, TAIL_DAYS } from "./Tail";

/** The Tail as the DOM sees it, rightmost Square last. */
function squares(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".tail-sq"));
}

function renderTail(options: {
  base?: number;
  elapsed?: number;
  ticked?: number[];
  chained?: boolean;
  pressed?: boolean;
  pulse?: "tick" | "untick" | null;
}) {
  const { base = 0, elapsed = 30, ticked = [], chained = false, pressed = false, pulse = null } = options;
  return render(
    <Tail
      base={base}
      elapsed={elapsed}
      isTicked={(offset) => ticked.includes(offset)}
      chained={chained}
      pressed={pressed}
      pulse={pulse}
    />,
  );
}

describe("the Tail", () => {
  it("is a week and a bit, with today rightmost", () => {
    renderTail({});
    const all = squares();
    expect(all).toHaveLength(TAIL_DAYS);
    expect(all[TAIL_DAYS - 1]).toHaveAttribute("data-today", "true");
    expect(all.slice(0, -1).every((sq) => !sq.hasAttribute("data-today"))).toBe(true);
  });

  it("is hidden from assistive tech, because the row already says it", () => {
    renderTail({});
    // The row's own aria-label carries the Habit, the state and the Day.
    expect(document.querySelector(".tail")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws nothing for Days before the account existed", () => {
    renderTail({ elapsed: 3 });
    const states = squares().map((sq) => sq.dataset.state);
    // Offsets 7..3 pre-date day one; offsets 2..0 have happened.
    expect(states).toEqual(["unborn", "unborn", "unborn", "unborn", "unborn", "empty", "empty", "empty"]);
  });

  it("marks the Days that were Ticked", () => {
    renderTail({ ticked: [0, 1, 4] });
    const states = squares().map((sq) => sq.dataset.state);
    expect(states).toEqual(["empty", "empty", "empty", "ticked", "empty", "empty", "ticked", "ticked"]);
  });

  it("hollows yesterday's Square while it is still open and empty", () => {
    renderTail({ ticked: [0] });
    const all = squares();
    // Second from the right is yesterday: inside the Grace Window and missed.
    expect(all[TAIL_DAYS - 2]).toHaveAttribute("data-open", "true");
    // The Day before that is closed; a hollow Square there would be an offer
    // the app cannot honour.
    expect(all[TAIL_DAYS - 3]).not.toHaveAttribute("data-open");
  });

  it("never hollows today's Square, which is the tick target", () => {
    renderTail({ ticked: [] });
    expect(squares()[TAIL_DAYS - 1]).not.toHaveAttribute("data-open");
  });

  it("bridges consecutive Days only for a Chained Habit", () => {
    const { unmount } = renderTail({ ticked: [0, 1, 2], chained: true });
    // Two bridges span three consecutive Days: a Chain reads as one object.
    expect(document.querySelectorAll(".bridge")).toHaveLength(2);
    unmount();

    renderTail({ ticked: [0, 1, 2], chained: false });
    expect(document.querySelectorAll(".bridge")).toHaveLength(0);
  });

  it("does not bridge across a missed Day", () => {
    renderTail({ ticked: [0, 2, 3], chained: true });
    expect(document.querySelectorAll(".bridge")).toHaveLength(1);
  });

  it("shows press and pulse on today's Square alone", () => {
    const { unmount } = renderTail({ pressed: true });
    expect(squares().filter((sq) => sq.hasAttribute("data-pressed"))).toHaveLength(1);
    unmount();

    renderTail({ pulse: "tick" });
    const pulsed = squares().filter((sq) => sq.hasAttribute("data-pulse"));
    expect(pulsed).toHaveLength(1);
    expect(pulsed[0]).toHaveAttribute("data-today", "true");
  });

  it("marks an untick differently from a tick, so the two do not share an animation", () => {
    renderTail({ pulse: "untick" });
    expect(squares()[TAIL_DAYS - 1]).toHaveAttribute("data-untick", "true");
    expect(squares()[TAIL_DAYS - 1]).not.toHaveAttribute("data-pulse");
  });

  it("shifts a Day back in the yesterday section", () => {
    // base 1: the rightmost Square is yesterday, and it is the tick target.
    renderTail({ base: 1, ticked: [1] });
    const all = squares();
    expect(all[TAIL_DAYS - 1]).toHaveAttribute("data-today", "true");
    expect(all[TAIL_DAYS - 1]?.dataset.state).toBe("ticked");
  });
});
