"use client";

import { GRACE_DAYS } from "@squares/domain/types";

export const TAIL_DAYS = 8;

interface TailProps {
  /** Offset of the rightmost Square: 0 on Home, 1 in the yesterday section. */
  base: number;
  elapsed: number;
  isTicked: (offset: number) => boolean;
  /** Bridges are only drawn for a Chained Habit. */
  chained: boolean;
  pressed: boolean;
  pulse: "tick" | "untick" | null;
}

/**
 * A week and a bit at 15px, doing three jobs at once — which is why it earns
 * the space on Home. It is the tick target (today is the rightmost Square), it
 * is the Chain preview (consecutive Squares are bridged, so a Chain reads as
 * one object rather than a number), and it is the "yesterday is still open" cue
 * (the second-from-right Square is hollow when yesterday was missed).
 */
export function Tail({ base, elapsed, isTicked, chained, pressed, pulse }: TailProps) {
  const squares = [];

  for (let index = TAIL_DAYS - 1; index >= 0; index--) {
    const offset = base + index;
    const target = index === 0;
    const unborn = offset >= elapsed;
    const ticked = !unborn && isTicked(offset);
    // The Day to the right of this one, which a bridge would reach across.
    const nextTicked = index > 0 && offset - 1 < elapsed && isTicked(offset - 1);
    const openAndEmpty = !target && !unborn && !ticked && offset <= GRACE_DAYS;

    const state = unborn ? "unborn" : ticked ? "ticked" : "empty";

    squares.push(
      <div
        key={offset}
        className="tail-sq"
        data-state={state}
        data-today={target || undefined}
        data-open={openAndEmpty || undefined}
        data-pressed={(target && pressed) || undefined}
        data-pulse={(target && pulse === "tick") || undefined}
        data-untick={(target && pulse === "untick") || undefined}
      >
        {ticked && nextTicked && chained ? <span className="bridge" /> : null}
      </div>,
    );
  }

  return (
    <div className="tail" aria-hidden="true">
      {squares}
    </div>
  );
}
