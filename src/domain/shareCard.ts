import { weekdayOf, type DateKey } from "./date";
import { gridGeometry, gridHeight, gridSquares, squareRadius, type Frame } from "./grid";
import { lensFrame, lensNoun, lensRows, type Lens } from "./lens";
import { CARD, css, DARK_LEVELS } from "./palette";
import { dateAt, intensityAt, isArchived, totalTicksIn } from "./selectors";
import type { AppData, Intensity } from "./types";

/**
 * What a Share Card is allowed to contain: a year of shape, one number, and —
 * only if each Habit was individually opted in — a single line of names.
 *
 * No dates, no handle, no per-Habit breakdown, and nothing that identifies the
 * device. The card is anonymous by default because people track "took my meds"
 * and "no drinking", and a card that leaks a name is the one unforgivable bug.
 */
export interface ShareCardModel {
  /** How much of the record this card draws. Chosen on the card's own Screen. */
  lens: Lens;
  frame: Frame;
  /** Rows the frame is drawn in: one for the Week, seven otherwise. */
  rows: number;
  weekday: number;
  /**
   * Intensity by offset; index 0 is today. A Day still to come has a negative
   * offset and is simply absent, which reads as Intensity 0 — which is what it
   * is, and what the Overview draws it at too.
   */
  levels: Intensity[];
  /**
   * The Tally: Ticks inside the Frame drawn. This is *not* the Total — under
   * the Week or the Month it counts a handful of Days and can be zero. A number
   * that can fall may not be called a Total; see CONTEXT.md.
   */
  tally: number;
  /** Named Habits only. Empty unless the user opted a Habit in by hand. */
  names: string[];
}

export function shareCardModel(data: AppData, today: DateKey, lens: Lens): ShareCardModel {
  const frame = lensFrame(lens, today);
  const levels: Intensity[] = [];
  for (let offset = 0; offset < frame.back; offset++) {
    levels.push(intensityAt(data, dateAt(today, offset)));
  }
  return {
    lens,
    frame,
    rows: lensRows(lens),
    weekday: weekdayOf(today),
    levels,
    tally: totalTicksIn(data, today, frame.back),
    // Archived Habits are excluded even when opted in. A name on a Card reads
    // as something the user does, and a retired Habit is not that. The opt-in
    // is reachable again now that Archived Habits have a Screen — this is a
    // rule about what the Card may claim, not a workaround for a dead control.
    names: data.habits
      .filter((habit) => habit.sharedName && !isArchived(habit, today))
      .map((habit) => habit.name.trim().toLowerCase()),
  };
}

/** Card geometry, in card units. The exported PNG is this times `scale`. */
const CARD_WIDTH = 320;
const PAD = 22;
const RADIUS = 14;
const GRID_TO_TOTAL = 18;
const TOTAL_SIZE = 30;
const CAPTION_SIZE = 9.5;
const NAMES_SIZE = 9.5;
const MARK_SIZE = 9;

const FONT = '"Hack", ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * The card draws the Lens's Frame exactly as the Overview does — the whole
 * Week, the whole Month, the whole Year — including Days still to come and Days
 * from before the account existed, all at Intensity 0.
 *
 * It used to trim to the Days that had happened, on the grounds that a card is a
 * record rather than a screen. That stopped working the moment the card had a
 * Lens: a Week card made on a Wednesday would be four Squares, and four Squares
 * do not read as a week. One rule for all three Lenses, and the shape of a card
 * no longer depends on the day you made it.
 */
function cardGeometry(model: ShareCardModel) {
  return gridGeometry(CARD_WIDTH - PAD * 2, model.frame, model.weekday, model.rows);
}

export function cardHeight(model: ShareCardModel): number {
  const names = model.names.length > 0 ? NAMES_SIZE + 6 : 0;
  return (
    PAD +
    gridHeight(cardGeometry(model)) +
    GRID_TO_TOTAL +
    TOTAL_SIZE +
    5 +
    CAPTION_SIZE +
    names +
    PAD
  );
}

export function cardSize(model: ShareCardModel, scale: number) {
  return { width: Math.round(CARD_WIDTH * scale), height: Math.round(cardHeight(model) * scale) };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Draw the card at `scale`. Everything below is in card units and multiplied on
 * the way out, so the preview on screen and the exported PNG are the same
 * drawing at two sizes rather than two drawings that have to be kept in step.
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  model: ShareCardModel,
  scale: number,
): void {
  const height = cardHeight(model);
  const u = (value: number) => value * scale;

  ctx.clearRect(0, 0, u(CARD_WIDTH), u(height));

  ctx.fillStyle = css(CARD.bg);
  roundRect(ctx, 0, 0, u(CARD_WIDTH), u(height), u(RADIUS));
  ctx.fill();
  ctx.strokeStyle = css(CARD.fg, 0.1);
  ctx.lineWidth = Math.max(1, u(1));
  roundRect(ctx, u(0.5), u(0.5), u(CARD_WIDTH) - u(1), u(height) - u(1), u(RADIUS));
  ctx.stroke();

  const content = CARD_WIDTH - PAD * 2;
  const geometry = cardGeometry(model);
  const squares = gridSquares(geometry.cols, model.frame, model.weekday, geometry.rows);
  const gridWidth = geometry.cols * geometry.size + (geometry.cols - 1) * geometry.gap;
  const originX = PAD + (content - gridWidth) / 2;

  // The radius is taken from the size the Square is actually drawn at, not
  // scaled up from the card-unit size, or the grid becomes a field of dots.
  const squarePx = u(geometry.size);
  const radiusPx = squareRadius(squarePx);

  for (const square of squares) {
    if (square.kind !== "framed") continue;
    // A Day still to come has a negative offset and no entry: Intensity 0,
    // which is also what a Day you missed draws at.
    const level = model.levels[square.offset] ?? 0;
    const x = originX + square.column * (geometry.size + geometry.gap);
    const y = PAD + square.row * (geometry.size + geometry.gap);
    ctx.fillStyle = css(DARK_LEVELS[level]!);
    roundRect(ctx, u(x), u(y), squarePx, squarePx, radiusPx);
    ctx.fill();

    // Today is ringed only where the frame runs on past it. Under the Week and
    // the Month there are Squares after today, and without the ring a Day you
    // missed and a Day that has not happened are the same empty Square. The
    // Year ends at today and needs no ring, so it ships unchanged.
    if (model.frame.ahead > 0 && square.offset === 0) {
      ctx.strokeStyle = css(CARD.fg, 0.55);
      ctx.lineWidth = Math.max(1, u(1.5));
      roundRect(ctx, u(x), u(y), squarePx, squarePx, radiusPx);
      ctx.stroke();
    }
  }

  const totalY = PAD + gridHeight(geometry) + GRID_TO_TOTAL;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  if ("letterSpacing" in ctx) ctx.letterSpacing = `${u(-1)}px`;
  ctx.fillStyle = css(CARD.fg);
  ctx.font = `700 ${u(TOTAL_SIZE)}px ${FONT}`;
  ctx.fillText(String(model.tally), u(PAD), u(totalY));
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const captionY = totalY + TOTAL_SIZE + 5;
  ctx.fillStyle = css(CARD.muted);
  ctx.font = `400 ${u(CAPTION_SIZE)}px ${FONT}`;
  // The caption names what the number counts. It has to: the number is a Tally
  // of the Frame drawn, not the Total, so "6" over seven Squares means six ticks
  // this week — and the card is handed to someone with no other context.
  ctx.fillText(`ticks · ${lensNoun(model.lens)}`, u(PAD), u(captionY));

  if (model.names.length > 0) {
    // One lowercase line, never separate rows — a per-Habit breakdown is a
    // leak waiting to happen.
    ctx.fillStyle = css(CARD.names);
    ctx.font = `400 ${u(NAMES_SIZE)}px ${FONT}`;
    ctx.fillText(model.names.join(" · "), u(PAD), u(captionY + CAPTION_SIZE + 6));
  }

  ctx.textAlign = "right";
  ctx.fillStyle = css(CARD.dim);
  ctx.font = `400 ${u(MARK_SIZE)}px ${FONT}`;
  ctx.fillText("squares", u(CARD_WIDTH - PAD), u(height - PAD - MARK_SIZE));
}
