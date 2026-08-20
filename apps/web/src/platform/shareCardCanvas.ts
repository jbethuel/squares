import { CARD, css, DARK_LEVELS } from "@squares/domain/palette";
import { gridHeight, gridSquares, squareRadius } from "@squares/domain/grid";
import { lensNoun } from "@squares/domain/lens";
import {
  CAPTION_SIZE,
  CARD_WIDTH,
  cardGeometry,
  cardHeight,
  FONT,
  GRID_TO_TOTAL,
  MARK_SIZE,
  NAMES_SIZE,
  PAD,
  RADIUS,
  TOTAL_SIZE,
  type ShareCardModel,
} from "@squares/domain/shareCard";

/**
 * The Share Card, drawn to a Canvas2D.
 *
 * This is the one rule-adjacent thing the phone app cannot share (ADR 0006):
 * React Native has no canvas, so the drawing forks and `shareCardModel` does
 * not. Everything here is in card units and multiplied on the way out, so the
 * preview on screen and the exported PNG are the same drawing at two sizes.
 */
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
