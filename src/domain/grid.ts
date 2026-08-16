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
  /** Columns across: weeks when the grid is a calendar block, Days when it is a row. */
  cols: number;
  /**
   * Rows down. Seven is the calendar shape a column of weekdays lines up in.
   * One is a single Week laid on its side — see `rows` on the functions below.
   */
  rows: number;
  /** Square edge in px. */
  size: number;
  gap: number;
  radius: number;
}

/**
 * The calendar shape: a column is a week, a row is a weekday.
 *
 * A frame of more than one week is drawn this way because the weekday rows line
 * up across columns, which is the whole reason the contribution graph reads. A
 * single week has no second column to line up with, so it is drawn in one row
 * instead — seven Squares left to right, Sunday to Saturday, at the size the
 * width allows rather than stood on end in a strip.
 */
export const CALENDAR_ROWS = 7;

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
 *
 * A one-row grid has nothing to complete: every column is a single Day, so the
 * last one is the newest Day itself and there is no weekday to pad out to.
 */
function trailing(frame: Frame, weekday: number, rows: number): number {
  if (rows === 1) return 0;
  return 6 - ((weekday + frame.ahead) % 7);
}

/** Columns needed to cover the frame at `rows` Days per column. */
export function gridColumns(frame: Frame, weekday: number, rows = CALENDAR_ROWS): number {
  return Math.max(1, Math.ceil((frameDays(frame) + trailing(frame, weekday, rows)) / rows));
}

export function gridGeometry(
  width: number,
  frame: Frame,
  weekday: number,
  rows = CALENDAR_ROWS,
): GridGeometry {
  const cols = gridColumns(frame, weekday, rows);
  let gap = Math.max(1.2, Math.min(4, (width / cols) * 0.16));
  let size = (width - (cols - 1) * gap) / cols;
  if (size > MAX_SQUARE) {
    size = MAX_SQUARE;
    gap = 6;
  }
  return { cols, rows, size: Math.max(size, 1), gap, radius: squareRadius(size) };
}

/** Height of a grid drawn at this geometry, in the same units as `size`. */
export function gridHeight(geometry: GridGeometry): number {
  return geometry.size * geometry.rows + geometry.gap * (geometry.rows - 1);
}

/** Width of a grid drawn at this geometry, in the same units as `size`. */
export function gridWidth(geometry: GridGeometry): number {
  return geometry.size * geometry.cols + geometry.gap * (geometry.cols - 1);
}

/**
 * Room for the weekday names beside a calendar block, in px.
 *
 * This comes out of the grid's width, so it is the whole price of the side
 * axis: on the Year, the one Frame wide enough to be width-bound, it takes a
 * Square from 5.43px to 4.96px. The Week and the Month cap at MAX_SQUARE and
 * lose nothing — the gutter only re-centres them.
 */
export const AXIS_GUTTER = 26;

/**
 * A Square in a grid that scrolls instead of fitting, and the gap beside it.
 *
 * The Year used to be squeezed to whatever made 53 columns fit a phone — 4.96px
 * once the weekday names took their gutter, which is smaller than the gap
 * between your fingertip and the thing you are looking at. A Frame this long
 * now keeps a Square the size the contribution graph draws one and runs off the
 * side of the Screen, opening at today.
 */
export const SCROLL_SQUARE = 11;
export const SCROLL_GAP = 3;

/**
 * Geometry for a grid that is not trying to fit. The width it ends up is
 * whatever the frame needs; the container scrolls to reach the rest.
 */
export function scrollGeometry(
  frame: Frame,
  weekday: number,
  rows = CALENDAR_ROWS,
): GridGeometry {
  return {
    cols: gridColumns(frame, weekday, rows),
    rows,
    size: SCROLL_SQUARE,
    gap: SCROLL_GAP,
    radius: squareRadius(SCROLL_SQUARE),
  };
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
 * Squares in DOM order for a column-flowing grid.
 *
 * At seven rows this is the calendar block: row 0 is Sunday, so today sits at
 * row `weekday` of whichever column its week occupies. At one row it is a week
 * laid out left to right, Sunday first, and each column is a single Day.
 */
export function gridSquares(
  cols: number,
  frame: Frame,
  weekday: number,
  rows = CALENDAR_ROWS,
): GridSquare[] {
  const squares: GridSquare[] = [];
  // The offset of the last cell drawn — the Saturday closing the final column
  // in a calendar block, or simply the newest Day in a single row. Negative:
  // it is the frame's newest Day pushed forward to the end of its week.
  const lastDrawn = -(frame.ahead + trailing(frame, weekday, rows));
  for (let column = 0; column < cols; column++) {
    for (let row = 0; row < rows; row++) {
      const offset = lastDrawn + (rows - 1 - row) + (cols - 1 - column) * rows;
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
