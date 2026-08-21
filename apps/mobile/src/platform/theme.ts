import { css, DARK_LEVELS, LIGHT_LEVELS, CARD, type Oklch } from "@squares/domain/palette";

/**
 * The ramp as React Native style values.
 *
 * The third consumer the ramp's single definition was made for: the web gets
 * generated custom properties, the Share Card gets sRGB for its canvas, and this
 * gets plain strings. None of them restate the numbers.
 *
 * React Native's colour parser does not accept `oklch()`, so everything is
 * converted to `rgb()` on the way out — which is what `css()` already does for
 * the canvas.
 */
const rgb = (levels: readonly Oklch[]) => levels.map((level) => css(level));

export const RAMP = {
  dark: rgb(DARK_LEVELS),
  light: rgb(LIGHT_LEVELS),
} as const;

export const SURFACE = {
  bg: css(CARD.bg),
  fg: css(CARD.fg),
  muted: css(CARD.muted),
  dim: css(CARD.dim),
} as const;
