/**
 * The names around a Heatmap: the weekdays beside it and the months above it.
 *
 * Where a month begins is a calendar question, not a layout one, so it is
 * answered here in plain TypeScript and tested without a DOM. The component
 * only has to place what comes back.
 *
 * A label's `track` is the grid line it sits on, and which axis that is depends
 * on the shape the Lens drew. In a calendar block of seven rows the weekdays
 * run down the side and a track is a row; in the Week's single row they run
 * along the top and a track is a column. Both cases name the same three days,
 * so both read off the same weekday index — Sunday is 0 either way.
 */
import { addDays, monthLabel, type DateKey } from "./date";
import type { GridSquare } from "./grid";

export interface AxisLabel {
  /** The row, or on a one-row grid the column, this label belongs to. */
  track: number;
  text: string;
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Monday, Wednesday and Friday, as the contribution graph does it.
 *
 * Every other day is left unnamed on purpose. At the Year's 5.43px rows the
 * names are taller than the Squares they label, so naming all seven would
 * overlap them into an unreadable stack — and three is enough to count from.
 */
export const NAMED_WEEKDAYS = [1, 3, 5];

export function weekdayLabels(): AxisLabel[] {
  return NAMED_WEEKDAYS.map((weekday) => ({ track: weekday, text: WEEKDAYS[weekday]! }));
}

/**
 * The room a month name needs, in px: 20 to render in and 3 to breathe.
 *
 * Measured rather than guessed — `mon`, `aug` and the rest all come out at 20px
 * at --fs-xs in the app's face.
 */
export const MONTH_LABEL_WIDTH = 23;

/**
 * Where each month starts, by column.
 *
 * A column is a week, and a week belongs to whichever month its Sunday falls
 * in — the same rule that decides which column a Day is drawn in, so a name
 * always sits above the first column of Squares that month owns.
 */
export function monthLabels(
  squares: readonly GridSquare[],
  today: DateKey,
  /** Px from one column to the next: the Square plus the gap beside it. */
  step: number,
): AxisLabel[] {
  const sundays = new Map<number, string>();
  let cols = 0;
  for (const square of squares) {
    cols = Math.max(cols, square.column + 1);
    if (square.row !== 0) continue;
    sundays.set(square.column, monthLabel(addDays(today, -square.offset)));
  }

  const starts: AxisLabel[] = [];
  let previous: string | null = null;
  for (const column of [...sundays.keys()].sort((a, b) => a - b)) {
    const month = sundays.get(column)!;
    if (month === previous) continue;
    previous = month;
    starts.push({ track: column, text: month });
  }

  /*
    A month is named if it owns the room to print its own name — measured
    forward, to where the next month starts, and against how wide a column
    actually is rather than a fixed number of them. The Year scrolls at 14px a
    column and can name a month that owns two; squeezed to fit a phone it
    stepped 6.14px and needed four. A fixed count would silently be wrong for
    one of them.

    Asking instead how close a name is to the last one *kept* drops whichever
    month happens to follow a crowded one, which on a rolling year means losing
    a whole month to keep the sliver of one at the edge. Measuring forward
    always sacrifices the part-month, which is the one with least to say.
  */
  const minColumns = Math.max(1, Math.ceil(MONTH_LABEL_WIDTH / step));
  return starts.filter((label, index) => {
    const next = starts[index + 1]?.track ?? cols;
    return next - label.track >= minColumns;
  });
}
