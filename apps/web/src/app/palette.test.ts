import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARD, DARK_LEVELS, toRgb } from "@squares/domain/palette";

const CSS = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** The dark block is first in the file, so the first five matches are its ramp. */
function levelsFromCss() {
  const matches = [...CSS.matchAll(/--lv(\d):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)];
  return matches.slice(0, 5).map((m) => ({
    l: Number(m[2]),
    c: Number(m[3]),
    h: Number(m[4]),
  }));
}

describe("palette", () => {
  it("matches the Intensity ramp defined in globals.css", () => {
    // The Share Card is drawn to a canvas and cannot read a CSS custom
    // property, so the ramp exists twice. It must never disagree.
    expect(levelsFromCss()).toEqual(DARK_LEVELS.map((level) => ({ ...level })));
  });

  it("keeps the ramp monotonic in lightness, which is what carries the data", () => {
    // Lightness is the one channel every form of colour vision agrees on, so
    // this is the property that survives deuteranopia and greyscale.
    const lightness = DARK_LEVELS.map((level) => level.l);
    expect(lightness).toEqual([...lightness].sort((a, b) => a - b));
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]! - lightness[i - 1]!).toBeGreaterThanOrEqual(0.14);
    }
  });

  it("keeps the levels distinct in greyscale, not just in hue", () => {
    // Rec. 709 luma: what a deuteranope, a mono printer, or a phone in
    // sunlight is left with. GitHub's ramp fails exactly here, because its
    // steps are separated mostly by saturation.
    const luma = DARK_LEVELS.map((level) => {
      const [r, g, b] = toRgb(level);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
    for (let i = 1; i < luma.length; i++) {
      expect(luma[i]! - luma[i - 1]!).toBeGreaterThan(20);
    }
  });

  it("converts oklch to plausible sRGB", () => {
    expect(toRgb({ l: 0, c: 0, h: 0 })).toEqual([0, 0, 0]);
    expect(toRgb({ l: 1, c: 0, h: 0 })).toEqual([255, 255, 255]);
    // Level 4 is the only saturated colour in the app: bright, and green.
    const [r, g, b] = toRgb(DARK_LEVELS[4]!);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(200);
  });

  it("exposes the card chrome the canvas needs", () => {
    expect(toRgb(CARD.bg).every((channel) => channel < 60)).toBe(true);
    expect(toRgb(CARD.fg).every((channel) => channel > 220)).toBe(true);
  });
});
