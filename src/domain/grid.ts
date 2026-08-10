/**
 * Heatmap geometry.
 *
 * A Heatmap draws a *frame*: a run of Days ending some distance either side of
 * today. The frame is the only thing that decides how many Squares there are,
 * and Square size is derived from the container, so the same component serves
 * a week at 40px, a month at ~14px and a year at ~5.4px with no second layout.
 *
 * Every Day the frame covers gets a Square, whether or not anything was ever
 * recorded on it: a Day before the account existed and a Day that has not
 * happened yet both draw at Intensity 0. The alternative — drawing only Days
 * that have happened — makes the week and the month change shape as they fill,
 * and a frame that changes size is not a frame.
 *
 * Only the cells needed to complete the first and last column fall outside the
 * frame, and those are not drawn at all. Nothing on a Heatmap stands for a Day
 * the Lens was not asked for: what you see is the frame exactly.
 */
export interface GridGeometry {
  /** Weeks wide. */
  cols: number;
  /** Square edge in px. */
  size: number;
  gap: number;
  radius: number;
}

/**
 * A run of Days, measured from today.
 *
 * `back` counts today itself, so `{ back: 1, ahead: 0 }` is today alone and
 * `{ back: 365, ahead: 0 }` is a rolling year ending today.
 */
export interface Frame {
  /** Days at or before today, today counting as 1. */
  back: number;
  /** Days after today. */
  ahead: number;
}

/** The largest a Square is ever drawn — a week, when there is least to see. */
export const MAX_SQUARE = 40;

/** Days in the frame. */
export function frameDays(frame: Frame): number {
  return frame.back + frame.ahead;
}

/**
 * Corner radius for a Square of a given edge, in the units it is actually
 * drawn in. A Square must read as a Square: scaling a radius computed for a
 * 4px cell up to a 16px one turns the grid into a field of dots.
 */
export function squareRadius(size: number): number {
  return size >= 18 ? 6 : size >= 10 ? 3 : 1.4;
}

/**
 * Days between the newest Day in the frame and the Saturday that closes its
 * column. Row 6 is Saturday, so the last column always runs to one.
 */
function trailing(frame: Frame, weekday: number): number {
  return 6 - ((weekday + frame.ahead) % 7);
}

/** Whole weeks needed to cover the frame. */
export function gridColumns(frame: Frame, weekday: number): number {
  return Math.max(1, Math.ceil((frameDays(frame) + trailing(frame, weekday)) / 7));
}

export function gridGeometry(width: number, frame: Frame, weekday: number): GridGeometry {
  const cols = gridColumns(frame, weekday);
  let gap = Math.max(1.2, Math.min(4, (width / cols) * 0.16));
  let size = (width - (cols - 1) * gap) / cols;
  if (size > MAX_SQUARE) {
    size = MAX_SQUARE;
    gap = 6;
  }
  return { cols, size: Math.max(size, 1), gap, radius: squareRadius(size) };
}

export type SquareKind =
  /** A Day the frame covers. Drawn, and shaded by whatever its record says. */
  | "framed"
  /** Outside the frame, present only to complete a column. Not drawn at all. */
  | "pad";

export interface GridSquare {
  key: string;
  /** Days before today. 0 is today; a Day still to come is negative. */
  offset: number;
  kind: SquareKind;
  column: number;
  row: number;
}

/**
 * Squares in DOM order for a 7-row, column-flowing grid. Row 0 is Sunday, so
 * today sits at row `weekday` of whichever column its week occupies.
 */
export function gridSquares(cols: number, frame: Frame, weekday: number): GridSquare[] {
  const squares: GridSquare[] = [];
  // The offset of the Saturday closing the last column. Negative: it is the
  // frame's newest Day pushed forward to the end of its week.
  const lastSaturday = -(frame.ahead + trailing(frame, weekday));
  for (let column = 0; column < cols; column++) {
    for (let row = 0; row < 7; row++) {
      const offset = lastSaturday + (6 - row) + (cols - 1 - column) * 7;
      const inFrame = offset >= -frame.ahead && offset < frame.back;
      squares.push({
        key: `${column}-${row}`,
        offset,
        kind: inFrame ? "framed" : "pad",
        column,
        row,
      });
    }
  }
  return squares;
}
