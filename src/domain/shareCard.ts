import { weekdayOf, type DateKey } from "./date";
import { gridGeometry, gridSquares, squareRadius, type Frame } from "./grid";
import { CARD, css, DARK_LEVELS } from "./palette";
import { dateAt, elapsedDays, intensityAt, isArchived, totalTicks } from "./selectors";
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
  elapsed: number;
  weekday: number;
  /** Intensity by offset; index 0 is today. */
  levels: Intensity[];
  total: number;
  /** Named Habits only. Empty unless the user opted a Habit in by hand. */
  names: string[];
}

export function shareCardModel(data: AppData, today: DateKey): ShareCardModel {
  const elapsed = elapsedDays(data, today);
  const levels: Intensity[] = [];
  for (let offset = 0; offset < elapsed; offset++) {
    levels.push(intensityAt(data, dateAt(today, offset)));
  }
  return {
    elapsed,
    weekday: weekdayOf(today),
    levels,
    total: totalTicks(data, today),
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
 * The card's frame ends at today and reaches back only as far as the account
 * goes, so the card keeps drawing exactly the Days that have happened. It is a
 * record, not a screen: it has no Lens and no empty future.
 */
function cardFrame(model: ShareCardModel): Frame {
  return { back: model.elapsed, ahead: 0 };
}

export function cardHeight(model: ShareCardModel): number {
  const content = CARD_WIDTH - PAD * 2;
  const geometry = gridGeometry(content, cardFrame(model), model.weekday);
  const gridHeight = geometry.size * 7 + geometry.gap * 6;
  const names = model.names.length > 0 ? NAMES_SIZE + 6 : 0;
  return PAD + gridHeight + GRID_TO_TOTAL + TOTAL_SIZE + 5 + CAPTION_SIZE + names + PAD;
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
  const frame = cardFrame(model);
  const geometry = gridGeometry(content, frame, model.weekday);
  const squares = gridSquares(geometry.cols, frame, model.weekday);
  const gridWidth = geometry.cols * geometry.size + (geometry.cols - 1) * geometry.gap;
  const originX = PAD + (content - gridWidth) / 2;

  // The radius is taken from the size the Square is actually drawn at, not
  // scaled up from the card-unit size, or the grid becomes a field of dots.
  const squarePx = u(geometry.size);
  const radiusPx = squareRadius(squarePx);

  for (const square of squares) {
    // The card shows only Days that have happened, and no today ring. It is a
    // record, not a live screen.
    if (square.kind !== "framed") continue;
    const level = model.levels[square.offset] ?? 0;
    const x = originX + square.column * (geometry.size + geometry.gap);
    const y = PAD + square.row * (geometry.size + geometry.gap);
    ctx.fillStyle = css(DARK_LEVELS[level]!);
    roundRect(ctx, u(x), u(y), squarePx, squarePx, radiusPx);
    ctx.fill();
  }

  const gridHeight = geometry.size * 7 + geometry.gap * 6;
  const totalY = PAD + gridHeight + GRID_TO_TOTAL;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  if ("letterSpacing" in ctx) ctx.letterSpacing = `${u(-1)}px`;
  ctx.fillStyle = css(CARD.fg);
  ctx.font = `700 ${u(TOTAL_SIZE)}px ${FONT}`;
  ctx.fillText(String(model.total), u(PAD), u(totalY));
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const captionY = totalY + TOTAL_SIZE + 5;
  ctx.fillStyle = css(CARD.muted);
  ctx.font = `400 ${u(CAPTION_SIZE)}px ${FONT}`;
  // Same caption as Home, day one included: a card made on the first morning
  // used to read "last 1 days".
  const caption = model.elapsed === 1 ? "ticks" : `ticks · last ${model.elapsed} days`;
  ctx.fillText(caption, u(PAD), u(captionY));

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
