import { describe, expect, it } from "vitest";
import { CARD, DARK_LEVELS, LIGHT_LEVELS, toRgb, type Oklch } from "./palette";

/** Rec. 709 luma: what a deuteranope, a mono printer, or a phone in sunlight is left with. */
const luma = (level: Oklch) => {
  const [r, g, b] = toRgb(level);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("the Intensity ramp", () => {
  // Lightness is the one channel every form of colour vision agrees on, so
  // this is the property that survives deuteranopia and greyscale. Dark climbs
  // and Light falls; what matters is that neither ever doubles back.
  it.each([
    ["dark", DARK_LEVELS, 1],
    ["light", LIGHT_LEVELS, -1],
  ])("steps monotonically in lightness (%s)", (_name, levels, direction) => {
    for (let i = 1; i < levels.length; i++) {
      const step = (levels[i]!.l - levels[i - 1]!.l) * direction;
      expect(step).toBeGreaterThanOrEqual(0.06);
    }
  });

  // GitHub's ramp fails exactly here, because its steps are separated mostly
  // by saturation rather than by lightness.
  it.each([
    ["dark", DARK_LEVELS, 1],
    ["light", LIGHT_LEVELS, -1],
  ])("keeps the levels distinct in greyscale, not just in hue (%s)", (_name, levels, direction) => {
    for (let i = 1; i < levels.length; i++) {
      expect((luma(levels[i]!) - luma(levels[i - 1]!)) * direction).toBeGreaterThan(15);
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
