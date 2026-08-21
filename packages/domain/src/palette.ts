/**
 * The Intensity ramp as numbers.
 *
 * This module is the ramp's one source. The web's `--lv0`..`--lv4` are generated
 * from it (`apps/web/scripts/generate-tokens.mts`), the Share Card's canvas
 * needs sRGB rather than a CSS custom property, and the phone app will want the
 * same numbers as style values — three consumers, one definition. It used to be
 * two definitions kept honest by a test, which is a guard that only works while
 * someone remembers to extend it.
 *
 * A Share Card is always the dark theme. It is a standalone image rather than a
 * screen, and dark is the designed theme — light is a port.
 */
export interface Oklch {
  l: number;
  c: number;
  h: number;
  /**
   * Opacity, 0-1. Absent means opaque.
   *
   * On the ramp this is never set — a Square is a solid colour. It is here for
   * the surface tokens below, where the rules, the hairlines and the rings are
   * defined as the foreground at a low alpha so that they sit correctly on
   * whatever is behind them in either Theme.
   */
  a?: number;
}

export const DARK_LEVELS: readonly Oklch[] = [
  { l: 0.235, c: 0.012, h: 128 },
  { l: 0.4, c: 0.055, h: 178 },
  { l: 0.55, c: 0.085, h: 155 },
  { l: 0.7, c: 0.125, h: 138 },
  { l: 0.85, c: 0.155, h: 118 },
];

/**
 * The Light port. Lightness runs the other way — a Tick darkens a pale Square
 * rather than lightening a dark one — so the ramp is monotonically *decreasing*
 * here while carrying the same data in the same channel.
 */
export const LIGHT_LEVELS: readonly Oklch[] = [
  { l: 0.925, c: 0.008, h: 128 },
  { l: 0.855, c: 0.055, h: 178 },
  { l: 0.745, c: 0.085, h: 155 },
  { l: 0.605, c: 0.105, h: 138 },
  { l: 0.47, c: 0.1, h: 120 },
];

export const CARD = {
  bg: { l: 0.16, c: 0.014, h: 128 },
  fg: { l: 0.97, c: 0.006, h: 120 },
  muted: { l: 0.71, c: 0.02, h: 125 },
  dim: { l: 0.55, c: 0.015, h: 125 },
  names: { l: 0.8, c: 0.11, h: 124 },
} as const;

/**
 * Everything the app draws that is not a Square.
 *
 * The ramp above had three consumers and one definition. These had two
 * consumers and, until the phone app grew Screens, one definition in the wrong
 * place: hand-written custom properties in `apps/web/src/app/globals.css`,
 * which React Native cannot read. The web's `tokens.css` is generated from
 * here now, exactly as the ramp already was, so the two interfaces ADR 0006
 * created cannot drift into two palettes.
 *
 * Keys are the CSS custom property names in camelCase — `surfaceOn` is
 * `--surface-on`. The generator kebab-cases them rather than holding a second
 * list that could fall out of step with this one.
 */
export interface Surface {
  /** The page behind everything. */
  bg: Oklch;
  /** A row, a card, a settings item: the one step up from the page. */
  surface: Oklch;
  /** A Ticked row. */
  surfaceOn: Oklch;
  /** A text field. */
  surfaceInput: Oklch;
  /** The pressed Lens, and anything that has to read as lifted. */
  surfaceRaised: Oklch;

  fg: Oklch;
  muted: Oklch;
  dim: Oklch;
  faint: Oklch;

  /** A hairline between blocks. */
  line: Oklch;
  /** A hairline that has to be seen: a field's edge, a dashed row. */
  lineStrong: Oklch;
  /** A Day that has not happened, outlined rather than filled. */
  ghost: Oklch;
  /** Today, ringed on a Heatmap. */
  ring: Oklch;
  /** Today, ringed in the Tail, where the Square is 15px and needs less. */
  tailRing: Oklch;

  accent: Oklch;
  onAccent: Oklch;
  /** A Chain's number, and a Named Habit on a Share Card. */
  chainFg: Oklch;
  /** The edge of a Ticked row. */
  rowOnLine: Oklch;
  knobOff: Oklch;
  trackOff: Oklch;
}

/**
 * The Dark palette — the one the app was designed in.
 *
 * Note what `--bg` is: the same colour as `CARD.bg` above. That is not a
 * coincidence to be deduplicated. A Share Card is always Dark whatever the app
 * is set to, so the two are equal under this Theme and independent under the
 * other; collapsing them would make the Light app repaint the Card.
 */
export const DARK_SURFACE: Surface = {
  bg: { l: 0.16, c: 0.014, h: 128 },
  surface: { l: 0.205, c: 0.016, h: 128 },
  surfaceOn: { l: 0.245, c: 0.022, h: 130 },
  surfaceInput: { l: 0.21, c: 0.017, h: 128 },
  surfaceRaised: { l: 0.27, c: 0.02, h: 128 },

  fg: { l: 0.97, c: 0.006, h: 120 },
  muted: { l: 0.71, c: 0.02, h: 125 },
  dim: { l: 0.55, c: 0.015, h: 125 },
  faint: { l: 0.5, c: 0.012, h: 125 },

  line: { l: 0.97, c: 0.006, h: 120, a: 0.09 },
  lineStrong: { l: 0.97, c: 0.006, h: 120, a: 0.14 },
  ghost: { l: 0.97, c: 0.006, h: 120, a: 0.13 },
  ring: { l: 0.97, c: 0.006, h: 120, a: 0.4 },
  tailRing: { l: 0.97, c: 0.006, h: 120, a: 0.32 },

  accent: { l: 0.7, c: 0.095, h: 128 },
  onAccent: { l: 0.16, c: 0.014, h: 128 },
  chainFg: { l: 0.8, c: 0.11, h: 124 },
  rowOnLine: { l: 0.7, c: 0.125, h: 138, a: 0.3 },
  knobOff: { l: 0.62, c: 0.018, h: 125 },
  trackOff: { l: 0.3, c: 0.02, h: 128 },
};

/**
 * The Light port. Lightness runs the other way, as it does on the ramp: the
 * rules and rings are the *background* at a low alpha rather than the
 * foreground, which is why their hue is 285 and not 120 — they were sampled
 * from the neutral the design used, not rotated off the green.
 */
export const LIGHT_SURFACE: Surface = {
  bg: { l: 1, c: 0, h: 0 },
  surface: { l: 0.975, c: 0.004, h: 128 },
  surfaceOn: { l: 0.955, c: 0.012, h: 130 },
  surfaceInput: { l: 0.98, c: 0.004, h: 128 },
  surfaceRaised: { l: 0.94, c: 0.008, h: 128 },

  fg: { l: 0.2, c: 0.01, h: 128 },
  muted: { l: 0.5, c: 0.012, h: 128 },
  dim: { l: 0.55, c: 0.012, h: 128 },
  faint: { l: 0.58, c: 0.012, h: 128 },

  line: { l: 0.141, c: 0.005, h: 285, a: 0.09 },
  lineStrong: { l: 0.141, c: 0.005, h: 285, a: 0.14 },
  ghost: { l: 0.141, c: 0.005, h: 285, a: 0.13 },
  ring: { l: 0.141, c: 0.005, h: 285, a: 0.35 },
  tailRing: { l: 0.141, c: 0.005, h: 285, a: 0.3 },

  accent: { l: 0.47, c: 0.1, h: 120 },
  onAccent: { l: 1, c: 0, h: 0 },
  chainFg: { l: 0.47, c: 0.1, h: 120 },
  rowOnLine: { l: 0.605, c: 0.105, h: 138, a: 0.3 },
  knobOff: { l: 1, c: 0, h: 0 },
  trackOff: { l: 0.85, c: 0.008, h: 128 },
};

/** oklch -> sRGB. Out-of-gamut values are clipped per channel. */
export function toRgb({ l, c, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];

  return linear.map((channel) => {
    const clipped = Math.max(0, Math.min(1, channel));
    const encoded = clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  }) as [number, number, number];
}

/**
 * A colour as a string every consumer can parse.
 *
 * The legacy comma form rather than the space-separated CSS Color Level 4 one,
 * which this used to emit. Canvas2D and React Native both take either, but
 * Reanimated's colour parser — which runs on the UI thread and has its own,
 * smaller implementation — takes only this one, and rejects `rgb(r g b / a)`
 * outright. Since the app animates between the alpha tokens (a row's edge going
 * from `--line` to `--row-on-line` as it is Ticked), the narrowest parser in the
 * set decides the format.
 *
 * The stylesheet is unaffected: `tokens.css` is rendered from the raw numbers by
 * `apps/web/src/app/tokens.ts` and stays in `oklch()`.
 */
export function css(colour: Oklch, alpha = colour.a ?? 1): string {
  const [r, g, b] = toRgb(colour);
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
