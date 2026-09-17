import { CARD, DARK_LEVELS } from "@squares/domain/palette";
import { canvas, rgbOf, roundedRect, type Canvas, type Rgb } from "./canvas.ts";

/**
 * Every PNG in the repository that is not a photograph, drawn from the one
 * ramp in `@squares/domain/palette`.
 *
 * ADR 0007 left two interfaces sharing a palette. An icon is the palette's
 * fourth consumer, after the web's custom properties, the Share Card's canvas
 * and React Native's colour strings — and the only one that was, until now, a
 * set of PNGs nobody could redraw. Moving the ramp meant the app changed colour
 * and its icon did not.
 */

/**
 * The mark: a four by four Overview, at four Intensities and one empty Day.
 *
 * Written as the picture it is. These sixteen Squares are a composition — the
 * empty Day sits top right where it reads as deliberate, and the darkest two
 * fall on a diagonal — so they are set down here rather than generated, which
 * would make every run a different mark.
 */
const MARK = ["2430", "4342", "1443", "3244"] as const;

/**
 * The feature graphic's field: seven rows, one per weekday, nineteen columns
 * that run off both edges.
 *
 * Noise rather than composition, but recorded all the same. A seeded generator
 * would be shorter and would redraw a different field the day the seed or the
 * generator moved, and this file is published on a store listing.
 */
const FIELD = [
  "3324333442014344133",
  "2442141323444432240",
  "3210341431013141440",
  "0442342243002204340",
  "2303400403343340042",
  "4222244344221233100",
  "3204143304343341220",
] as const;

/** A Square's corner, as a fraction of its side. */
const CORNER = 0.2;

/**
 * The space between two Squares in the mark, as a fraction of one Square.
 *
 * The feature graphic does not use it. Its Squares are 44px on a 56px pitch —
 * a gutter of 0.273 — because that field is laid out in whole pixels to sit on
 * a fixed 1024 by 500 canvas, where the mark is laid out in proportions so it
 * can be drawn at any size. Deriving one from the other put the right-hand
 * column seventeen pixels off.
 */
const GUTTER = 0.294;

/** The ramp, and the flat white Android tints for itself. */
export const RAMP = (level: number): Rgb => rgbOf(DARK_LEVELS[level]!);
export const WHITE = (): Rgb => [255, 255, 255];

export const BACKGROUND = rgbOf(CARD.bg);

/**
 * The side of one Square, when `count` of them and their gutters span `across`.
 */
function side(across: number, count: number): number {
  return across / (count + (count - 1) * GUTTER);
}

function paint(
  target: Canvas,
  rows: readonly string[],
  x: number,
  y: number,
  cell: number,
  pitch: number,
  ink: (level: number) => Rgb,
): void {
  rows.forEach((row, r) => {
    [...row].forEach((square, c) => {
      // Level 0 is an empty Day and is still drawn. It is a Square that was not
      // Logged, not an absence — the same thing the Overview shows.
      roundedRect(target, x + c * pitch, y + r * pitch, cell, cell, cell * CORNER, ink(Number(square)));
    });
  });
}

export interface IconSpec {
  /** Pixels, square. */
  size: number;
  /**
   * How much of that side the mark spans, as a fraction.
   *
   * Three values, and each is a platform's rule rather than a taste: a plain
   * icon fills it, an Android adaptive foreground has to survive being masked
   * to 66%, and a maskable web icon to 80%. Each sits inside its own safe zone
   * with room to spare.
   */
  span: number;
  /** Omitted for the layers that are drawn onto something else. */
  background?: Rgb;
  /** The Android monochrome layer is one flat colour the system tints. */
  ink?: (level: number) => Rgb;
}

export function icon({ size, span, background, ink = RAMP }: IconSpec): Canvas {
  const target = canvas(size, size, background);
  const across = size * span;
  const cell = side(across, MARK.length);
  paint(target, MARK, (size - across) / 2, (size - across) / 2, cell, cell * (1 + GUTTER), ink);
  return target;
}

/** The flat layer under the adaptive icon's foreground. */
export function plate(size: number): Canvas {
  return canvas(size, size, BACKGROUND);
}

/**
 * The Play listing's feature graphic: 1024 by 500, and the only artwork here
 * that is not the mark.
 *
 * The field runs off both edges on purpose. A listing graphic is cropped
 * differently in every place Play shows it, and a composition that bleeds
 * survives that where a centred one loses its margins.
 */
export function featureGraphic(): Canvas {
  const target = canvas(1024, 500, BACKGROUND);
  // Whole pixels, measured from the graphic this replaces so redrawing it moves
  // nothing: 44px Squares on a 56px pitch, the first column starting off-canvas.
  paint(target, FIELD, -22, 61, 44, 56, RAMP);
  return target;
}

/** One file, and how to draw it. Paths are from the root of the repository. */
export interface Art {
  path: string;
  draw: () => Canvas;
}

const MARK_SPAN = 0.71875;
/** Android masks an adaptive icon to 66% of the layer. */
const ADAPTIVE_SPAN = 0.4326;
/** A maskable web icon must survive a crop to 80%. */
const MASKABLE_SPAN = 0.5605;
/**
 * Google Play's square keyline: 304px of its 512px icon.
 *
 * Play's grid is the 48-unit launcher grid set in the middle 384px of the
 * asset, eight pixels a unit, and a logo that is a square goes on its 38-unit
 * square. The mark is a square. The rest of the asset is the background, full
 * bleed, because Play rounds the corners (30% of the side) and adds the shadow
 * itself.
 */
const PLAY_SPAN = 304 / 512;

export const ICONS: readonly Art[] = [
  { path: "apps/web/public/icon-512.png", draw: () => icon({ size: 512, span: MARK_SPAN, background: BACKGROUND }) },
  { path: "apps/web/public/icon-192.png", draw: () => icon({ size: 192, span: MARK_SPAN, background: BACKGROUND }) },
  { path: "apps/web/public/apple-touch-icon.png", draw: () => icon({ size: 180, span: MARK_SPAN, background: BACKGROUND }) },
  {
    path: "apps/web/public/icon-maskable-512.png",
    draw: () => icon({ size: 512, span: MASKABLE_SPAN, background: BACKGROUND }),
  },
  {
    path: "apps/mobile/assets/images/icon.png",
    draw: () => icon({ size: 1024, span: MARK_SPAN, background: BACKGROUND }),
  },
  {
    path: "apps/mobile/assets/images/android-icon-foreground.png",
    draw: () => icon({ size: 1024, span: ADAPTIVE_SPAN }),
  },
  { path: "apps/mobile/assets/images/android-icon-background.png", draw: () => plate(1024) },
  {
    path: "apps/mobile/assets/images/android-icon-monochrome.png",
    draw: () => icon({ size: 1024, span: ADAPTIVE_SPAN, ink: WHITE }),
  },
  // Transparent: `app.config.ts` draws it on the Share Card's background at 76
  // points, and a plate of its own would be a square edge on that ground.
  { path: "apps/mobile/assets/images/splash-icon.png", draw: () => icon({ size: 512, span: 0.8809 }) },
];

export const STORE_ASSETS: readonly Art[] = [
  // The same drawing as every other icon, at Play's keyline rather than the
  // web's span: Play masks and scales this one itself, and its spec says where
  // a logo sits inside it.
  { path: "store/android/play-icon-512.png", draw: () => icon({ size: 512, span: PLAY_SPAN, background: BACKGROUND }) },
  { path: "store/android/play-feature-graphic-1024x500.png", draw: featureGraphic },
];
