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

export function css(colour: Oklch, alpha = 1): string {
  const [r, g, b] = toRgb(colour);
  return alpha === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
}
