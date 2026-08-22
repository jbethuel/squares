import {
  FontWeight,
  ImageFormat,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkColor,
  type SkFont,
  type SkPaint,
} from "@shopify/react-native-skia";
import { CARD, DARK_LEVELS, toRgb, type Oklch } from "@squares/domain/palette";
import { gridHeight, gridSquares, squareRadius } from "@squares/domain/grid";
import { lensNoun } from "@squares/domain/lens";
import {
  CAPTION_SIZE,
  CARD_WIDTH,
  cardGeometry,
  cardHeight,
  GRID_TO_TOTAL,
  MARK_SIZE,
  NAMES_SIZE,
  PAD,
  RADIUS,
  TOTAL_SIZE,
  type ShareCardModel,
} from "@squares/domain/shareCard";
import { MONO } from "./theme";

/**
 * The Share Card, drawn with Skia.
 *
 * This is the one rule-adjacent thing the two interfaces cannot share (ADR
 * 0006): React Native has no canvas, so the drawing forks and `shareCardModel`
 * does not. Every measurement — the width, the padding, where the Tally sits —
 * comes from `@squares/domain/shareCard`, which the web's Canvas2D version
 * reads too. A Share Card whose geometry differed by platform is a Share Card
 * nobody can trust.
 *
 * Line for line this is `apps/web/src/platform/shareCardCanvas.ts` with the
 * Canvas2D calls swapped for Skia ones. Three things do not map directly and
 * are handled in `text` below: Canvas2D's `textBaseline = "top"` against Skia's
 * baseline origin, its `textAlign = "right"`, and its `letterSpacing`.
 */

/** `SkColor` is a Float32Array of normalised components, so no string is parsed. */
const skColour = (colour: Oklch, alpha = colour.a ?? 1): SkColor => {
  const [r, g, b] = toRgb(colour);
  return Float32Array.of(r / 255, g / 255, b / 255, alpha);
};

const fill = (colour: SkColor): SkPaint => {
  const paint = Skia.Paint();
  paint.setColor(colour);
  paint.setAntiAlias(true);
  return paint;
};

const stroke = (colour: SkColor, width: number): SkPaint => {
  const paint = fill(colour);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  return paint;
};

function roundRect(
  canvas: SkCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  paint: SkPaint,
) {
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paint);
}

/**
 * Text, with the two Canvas2D conveniences Skia does not have.
 *
 * Skia draws from the baseline; the card is laid out from the top of each line,
 * so the ascent is added back. And Skia has no letter spacing, so tracking is
 * applied by placing each glyph — which the Tally needs, because at `-1` card
 * unit across a two-digit number it is a visible amount of width.
 */
function text(
  canvas: SkCanvas,
  content: string,
  x: number,
  top: number,
  font: SkFont,
  paint: SkPaint,
  { tracking = 0, align = "left" as "left" | "right" } = {},
) {
  const glyphs = font.getGlyphIDs(content);
  const widths = font.getGlyphWidths(glyphs, paint);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (glyphs.length - 1);
  const baseline = top - font.getMetrics().ascent;
  let cursor = align === "right" ? x - total : x;
  const positions = glyphs.map((_, index) => {
    const point = { x: cursor, y: baseline };
    cursor += widths[index]! + tracking;
    return point;
  });
  canvas.drawGlyphs(glyphs, positions, 0, 0, font, paint);
}

const typeface = (weight: FontWeight) => Skia.FontMgr.System().matchFamilyStyle(MONO, { weight });

/**
 * Draw the card at `scale`. Everything below is in card units and multiplied on
 * the way out, so the preview on screen and the exported PNG are the same
 * drawing at two sizes rather than two drawings that have to be kept in step.
 */
export function drawShareCard(canvas: SkCanvas, model: ShareCardModel, scale: number): void {
  const height = cardHeight(model);
  const u = (value: number) => value * scale;

  canvas.clear(Float32Array.of(0, 0, 0, 0));

  roundRect(canvas, 0, 0, u(CARD_WIDTH), u(height), u(RADIUS), fill(skColour(CARD.bg)));
  roundRect(
    canvas,
    u(0.5),
    u(0.5),
    u(CARD_WIDTH) - u(1),
    u(height) - u(1),
    u(RADIUS),
    stroke(skColour(CARD.fg, 0.1), Math.max(1, u(1))),
  );

  const content = CARD_WIDTH - PAD * 2;
  const geometry = cardGeometry(model);
  const squares = gridSquares(geometry.cols, model.frame, model.weekday, geometry.rows);
  const gridW = geometry.cols * geometry.size + (geometry.cols - 1) * geometry.gap;
  const originX = PAD + (content - gridW) / 2;

  // The radius is taken from the size the Square is actually drawn at, not
  // scaled up from the card-unit size, or the grid becomes a field of dots.
  const squarePx = u(geometry.size);
  const radiusPx = squareRadius(squarePx);
  const ring = stroke(skColour(CARD.fg, 0.55), Math.max(1, u(1.5)));

  for (const square of squares) {
    if (square.kind !== "framed") continue;
    // A Day still to come has a negative offset and no entry: Intensity 0,
    // which is also what a Day you missed draws at.
    const level = model.levels[square.offset] ?? 0;
    const x = originX + square.column * (geometry.size + geometry.gap);
    const y = PAD + square.row * (geometry.size + geometry.gap);
    roundRect(canvas, u(x), u(y), squarePx, squarePx, radiusPx, fill(skColour(DARK_LEVELS[level]!)));

    // Today is ringed only where the frame runs on past it. Under the Week and
    // the Month there are Squares after today, and without the ring a Day you
    // missed and a Day that has not happened are the same empty Square. The
    // Year ends at today and needs no ring.
    if (model.frame.ahead > 0 && square.offset === 0) {
      roundRect(canvas, u(x), u(y), squarePx, squarePx, radiusPx, ring);
    }
  }

  const totalY = PAD + gridHeight(geometry) + GRID_TO_TOTAL;
  const bold = typeface(FontWeight.Bold);
  const regular = typeface(FontWeight.Normal);

  text(
    canvas,
    String(model.tally),
    u(PAD),
    u(totalY),
    Skia.Font(bold, u(TOTAL_SIZE)),
    fill(skColour(CARD.fg)),
    { tracking: u(-1) },
  );

  const captionY = totalY + TOTAL_SIZE + 5;
  // The caption names what the number counts. It has to: the number is a Tally
  // of the Frame drawn, not the Total, so "6" over seven Squares means six logs
  // this week — and the card is handed to someone with no other context.
  text(
    canvas,
    `logs · ${lensNoun(model.lens)}`,
    u(PAD),
    u(captionY),
    Skia.Font(regular, u(CAPTION_SIZE)),
    fill(skColour(CARD.muted)),
  );

  if (model.names.length > 0) {
    // One lowercase line, never separate rows — a per-Habit breakdown is a
    // leak waiting to happen.
    text(
      canvas,
      model.names.join(" · "),
      u(PAD),
      u(captionY + CAPTION_SIZE + 6),
      Skia.Font(regular, u(NAMES_SIZE)),
      fill(skColour(CARD.names)),
    );
  }

  text(
    canvas,
    "squares",
    u(CARD_WIDTH - PAD),
    u(height - PAD - MARK_SIZE),
    Skia.Font(regular, u(MARK_SIZE)),
    fill(skColour(CARD.dim)),
    { align: "right" },
  );
}

/** The PNG is drawn at 4x the card's design units: 1280px wide. */
export const EXPORT_SCALE = 4;

export interface RenderedCard {
  /** The PNG, for both the preview and the file. */
  base64: string;
  width: number;
  height: number;
}

/**
 * The card as a PNG, once.
 *
 * The web draws into one canvas at export size and lets CSS scale it down for
 * the preview, so what you look at is the file you save. This does the same: a
 * CPU surface at export size, snapshotted, then shown as an image and handed to
 * the share sheet unchanged. Two renders — one to look at and one to save — is
 * how a preview ends up lying about the card.
 */
export function renderShareCard(model: ShareCardModel): RenderedCard | null {
  const width = Math.round(CARD_WIDTH * EXPORT_SCALE);
  const height = Math.round(cardHeight(model) * EXPORT_SCALE);
  const surface = Skia.Surface.Make(width, height);
  if (!surface) return null;
  drawShareCard(surface.getCanvas(), model, EXPORT_SCALE);
  surface.flush();
  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.PNG, 100);
  return { base64, width, height };
}
