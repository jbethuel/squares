import { Platform, useColorScheme } from "react-native";
import {
  css,
  DARK_LEVELS,
  DARK_SURFACE,
  LIGHT_LEVELS,
  LIGHT_SURFACE,
  type Oklch,
  type Surface,
} from "@squares/domain/palette";
import { useStore } from "@squares/domain/store";

/**
 * The palette as React Native style values.
 *
 * The third consumer the palette's single definition was made for: the web gets
 * generated custom properties, the Share Card gets sRGB for its canvas, and this
 * gets plain strings. None of them restate the numbers.
 *
 * React Native's colour parser does not accept `oklch()`, so everything is
 * converted on the way out by `css()` — which is what the Share Card's canvas
 * already used it for. It emits the legacy comma form because Reanimated
 * interpolates between these strings and will not parse anything else.
 */
const rgb = (levels: readonly Oklch[]) => levels.map((level) => css(level));

/** Every surface token as a string, under the same key the palette gives it. */
type Palette = { [K in keyof Surface]: string };

const palette = (tokens: Surface): Palette =>
  Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [key, css(value)]),
  ) as Palette;

export interface Theme extends Palette {
  /** The Intensity ramp, indexed by Intensity: `ramp[3]` is `--lv3`. */
  ramp: string[];
  /** True while the Dark palette is the one in use. */
  dark: boolean;
  /** The accent at 35%: `.card-accent`'s border, which the web colour-mixes. */
  accentEdge: string;
}

export const DARK: Theme = {
  ...palette(DARK_SURFACE),
  ramp: rgb(DARK_LEVELS),
  dark: true,
  accentEdge: css(DARK_SURFACE.accent, 0.35),
};

export const LIGHT: Theme = {
  ...palette(LIGHT_SURFACE),
  ramp: rgb(LIGHT_LEVELS),
  dark: false,
  accentEdge: css(LIGHT_SURFACE.accent, 0.35),
};

/**
 * The Theme in force.
 *
 * System means dark unless the device asks for light — `CONTEXT.md`, Theme. So
 * the check is for light explicitly rather than for "not dark": React Native
 * reports `null` on a device with no preference, and treating that as light
 * would open the app in the port rather than in the palette it was designed in.
 */
export function useTheme(): Theme {
  const { data } = useStore();
  const device = useColorScheme();
  const resolved = data.theme === "system" ? (device === "light" ? "light" : "dark") : data.theme;
  return resolved === "light" ? LIGHT : DARK;
}

/**
 * The type scale, in the steps `globals.css` defines. Whole pixels, five steps
 * and two display sizes; every size in the app is one of them.
 *
 * The web's 16px floor on text controls is not here. That is an iOS *Safari*
 * zoom threshold, not a type decision — a React Native `TextInput` does not
 * zoom the page, because there is no page.
 */
export const FS = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  /** The two numbers that are read as shapes rather than as text. */
  display: 40,
  hero: 44,
} as const;

/**
 * Hack is not on the phone.
 *
 * The web loads it as two woff2 files, which React Native cannot use — it wants
 * TTF or OTF — so the app draws in the platform monospace instead. That is the
 * same fallback the web stylesheet already declares one name down its own
 * stack, so the two interfaces agree on the shape of the type even where they
 * differ on the face. Shipping Hack here means adding the TTFs to `assets/` and
 * loading them through `expo-font`.
 */
export const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
