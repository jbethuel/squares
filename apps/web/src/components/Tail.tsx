"use client";

export const TAIL_DAYS = 8;

interface TailProps {
  /** Offset of the rightmost Square. 0 everywhere: only today can be Logged. */
  base: number;
  elapsed: number;
  isLogged: (offset: number) => boolean;
  /** Bridges are only drawn for a Streak Habit. */
  streaks: boolean;
  pressed: boolean;
  pulse: "log" | "unlog" | null;
}

/**
 * A week and a bit at 15px, doing two jobs at once — which is why it earns the
 * space on Home. It is the Log target (today is the rightmost Square), and it
 * is the Streak preview (consecutive Squares are bridged, so a Streak reads as
 * one object rather than a number).
 *
 * ADR 0002: no Square but the rightmost is a target. A missed Day is drawn the
 * same as any other empty Day, because nothing can be done about it.
 */
export function Tail({ base, elapsed, isLogged, streaks, pressed, pulse }: TailProps) {
  const squares = [];

  for (let index = TAIL_DAYS - 1; index >= 0; index--) {
    const offset = base + index;
    const target = index === 0;
    const unborn = offset >= elapsed;
    const logged = !unborn && isLogged(offset);
    // The Day to the right of this one, which a bridge would reach across.
    const nextLogged = index > 0 && offset - 1 < elapsed && isLogged(offset - 1);

    const state = unborn ? "unborn" : logged ? "logged" : "empty";

    squares.push(
      <div
        key={offset}
        className="tail-sq"
        data-state={state}
        data-today={target || undefined}
        data-pressed={(target && pressed) || undefined}
        data-pulse={(target && pulse === "log") || undefined}
        data-unlog={(target && pulse === "unlog") || undefined}
      >
        {logged && nextLogged && streaks ? <span className="bridge" /> : null}
      </div>,
    );
  }

  return (
    <div className="tail" aria-hidden="true">
      {squares}
    </div>
  );
}
