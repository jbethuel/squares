/**
 * Heatmap geometry.
 *
 * Design decisions A and B, in one function: the Overview contains *only Days
 * that have happened* and always fills the width it is given. Day one is a
 * single column of 40px Squares; by week twenty it has settled into the
 * 53-column texture and stops changing shape. The widening is the progress
 * indicator — there is no number, badge or fake data anywhere near it.
 *
 * Because size is derived from the container, the same component serves day one
 * at 40px, a phone at ~5.4px and a desktop at 12px with no second layout.
 */
export interface GridGeometry {
  /** Weeks wide. The last column is the current, partly-unlived week. */
  cols: number;
  /** Square edge in px. */
  size: number;
  gap: number;
  radius: number;
}

/** The largest a Square is ever drawn — day one, when there is least to see. */
export const MAX_SQUARE = 40;

/**
 * Corner radius for a Square of a given edge, in the units it is actually
 * drawn in. A Square must read as a Square: scaling a radius computed for a
 * 4px cell up to a 16px one turns the grid into a field of dots.
 */
export function squareRadius(size: number): number {
  return size >= 18 ? 6 : size >= 10 ? 3 : 1.4;
}

export function gridGeometry(width: number, elapsed: number, weekday: number): GridGeometry {
  const cols = Math.max(1, Math.ceil((elapsed + (6 - weekday)) / 7));
  let gap = Math.max(1.2, Math.min(4, (width / cols) * 0.16));
  let size = (width - (cols - 1) * gap) / cols;
  if (size > MAX_SQUARE) {
    size = MAX_SQUARE;
    gap = 6;
  }
  return { cols, size: Math.max(size, 1), gap, radius: squareRadius(size) };
}

export type SquareKind =
  /** A Day that has happened: shaded by Intensity. */
  | "lived"
  /** Later this week. Drawn as a dashed ghost so the week reads as a whole. */
  | "future"
  /** Before the account existed. Not drawn at all — see design note A. */
  | "unborn";

export interface GridSquare {
  key: string;
  /** Days before today. 0 is today. */
  offset: number;
  kind: SquareKind;
  column: number;
  row: number;
}

/**
 * Squares in DOM order for a 7-row, column-flowing grid. Row 0 is Sunday, so
 * the rightmost column is the current week with today at row `weekday`.
 */
export function gridSquares(cols: number, elapsed: number, weekday: number): GridSquare[] {
  const squares: GridSquare[] = [];
  for (let column = 0; column < cols; column++) {
    for (let row = 0; row < 7; row++) {
      const offset = (cols - 1 - column) * 7 + (weekday - row);
      const kind: SquareKind = offset < 0 ? "future" : offset >= elapsed ? "unborn" : "lived";
      squares.push({ key: `${column}-${row}`, offset, kind, column, row });
    }
  }
  return squares;
}
