import { describe, expect, it } from "vitest";
import { DARK_LEVELS, CARD, toRgb } from "@squares/domain/palette";
import { canvas, roundedRect } from "./canvas.ts";
import { encodePng } from "./png.ts";
import { BACKGROUND, ICONS, STORE_ASSETS, featureGraphic, icon } from "./artwork.ts";

/**
 * The centre of one Square of the mark.
 *
 * Not the centre of the canvas: the mark is four Squares across, so the middle
 * of the image falls in the gutter between the second and third.
 */
function cellCentre(size: number, span: number, row: number, col: number): [number, number] {
  const across = size * span;
  const cell = across / (4 + 3 * 0.294);
  const pitch = cell * 1.294;
  const origin = (size - across) / 2;
  return [
    Math.round(origin + col * pitch + cell / 2),
    Math.round(origin + row * pitch + cell / 2),
  ];
}

/** The pixel at (x, y), as RGBA. */
function at(art: { width: number; data: Uint8Array }, x: number, y: number): number[] {
  const o = (y * art.width + x) * 4;
  return [art.data[o]!, art.data[o + 1]!, art.data[o + 2]!, art.data[o + 3]!];
}

describe("the mark is drawn from the ramp", () => {
  // The whole reason this package exists: an icon that restates the palette is
  // an icon that stops matching it. Every Square is checked against the ramp
  // itself rather than against a hex string copied out of it.
  it("paints each Square the Intensity the ramp gives", () => {
    const art = icon({ size: 512, span: 0.71875, background: BACKGROUND });
    const mark = [
      [2, 4, 3, 0],
      [4, 3, 4, 2],
      [1, 4, 4, 3],
      [3, 2, 4, 4],
    ];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const [x, y] = cellCentre(512, 0.71875, r, c);
        expect(at(art, x, y).slice(0, 3)).toEqual(toRgb(DARK_LEVELS[mark[r]![c]!]!));
      }
    }
  });

  it("sits on the Share Card's background, not a colour of its own", () => {
    const art = icon({ size: 64, span: 0.71875, background: BACKGROUND });
    expect(at(art, 0, 0)).toEqual([...toRgb(CARD.bg), 255]);
  });

  it("leaves the adaptive foreground transparent, so the plate shows through", () => {
    const art = icon({ size: 128, span: 0.4326 });
    expect(at(art, 0, 0)[3]).toBe(0);
    expect(at(art, ...cellCentre(128, 0.4326, 1, 1))[3]).toBe(255);
  });

  it("draws the monochrome layer flat white for Android to tint", () => {
    const art = icon({ size: 128, span: 0.4326, ink: () => [255, 255, 255] });
    expect(at(art, ...cellCentre(128, 0.4326, 1, 1))).toEqual([255, 255, 255, 255]);
  });

  it("keeps the mark inside the safe zone every mask crops to", () => {
    // Android masks an adaptive icon to 66% of the layer, and a maskable web
    // icon can be cropped to 80%. A mark that reaches past either loses corners.
    const adaptive = ICONS.find((a) => a.path.endsWith("android-icon-foreground.png"))!;
    const art = adaptive.draw();
    const safe = Math.round((art.width * (1 - 0.66)) / 2);
    for (let i = 0; i < safe; i++) {
      expect(at(art, i, art.height / 2)[3]).toBe(0);
      expect(at(art, art.width / 2, i)[3]).toBe(0);
    }
  });
});

describe("the feature graphic", () => {
  it("is the size Play asks for", () => {
    const art = featureGraphic();
    expect([art.width, art.height]).toEqual([1024, 500]);
  });

  it("runs off both edges rather than sitting in a margin", () => {
    const art = featureGraphic();
    const row = 61 + 22;
    expect(at(art, 0, row).slice(0, 3)).not.toEqual(toRgb(CARD.bg));
    expect(at(art, 1023, row).slice(0, 3)).not.toEqual(toRgb(CARD.bg));
  });

  it("gives each weekday a row", () => {
    // Seven rows, and the band above the first and below the last is ground.
    const art = featureGraphic();
    expect(at(art, 512, 30).slice(0, 3)).toEqual(toRgb(CARD.bg));
    expect(at(art, 512, 470).slice(0, 3)).toEqual(toRgb(CARD.bg));
  });
});

describe("the Play icon", () => {
  // Google Play's icon spec: a full square, opaque, with no corners or shadow
  // of its own, and a square logo on the 304px square keyline.
  const play = STORE_ASSETS.find((a) => a.path.endsWith("play-icon-512.png"))!;
  const span = 304 / 512;

  it("is opaque to its corners, for Play to round and shadow", () => {
    const art = play.draw();
    for (let i = 3; i < art.data.length; i += 4) expect(art.data[i]).toBe(255);
    expect(at(art, 0, 0)).toEqual([...toRgb(CARD.bg), 255]);
    expect(at(art, 511, 511)).toEqual([...toRgb(CARD.bg), 255]);
  });

  it("puts the mark on the square keyline and no further", () => {
    const art = play.draw();
    const ground = toRgb(CARD.bg);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        if (x >= 104 && x < 408 && y >= 104 && y < 408) continue;
        expect(at(art, x, y).slice(0, 3)).toEqual(ground);
      }
    }
    // It reaches the keyline, not only stays inside it.
    const [, row] = cellCentre(512, span, 0, 0);
    expect(at(art, 104, row).slice(0, 3)).not.toEqual(ground);
    expect(at(art, 407, row).slice(0, 3)).not.toEqual(ground);
  });

  it("is under Play's 1024KB limit", () => {
    const art = play.draw();
    expect(encodePng(art.width, art.height, art.data).length).toBeLessThanOrEqual(1024 * 1024);
  });
});

describe("every file the scripts write", () => {
  it("draws at the size its name and platform promise", () => {
    const sizes = new Map([
      ["apps/web/public/icon-512.png", 512],
      ["apps/web/public/icon-192.png", 192],
      ["apps/web/public/apple-touch-icon.png", 180],
      ["apps/web/public/icon-maskable-512.png", 512],
      ["apps/mobile/assets/images/icon.png", 1024],
      ["apps/mobile/assets/images/android-icon-foreground.png", 1024],
      ["apps/mobile/assets/images/android-icon-background.png", 1024],
      ["apps/mobile/assets/images/android-icon-monochrome.png", 1024],
      ["apps/mobile/assets/images/splash-icon.png", 512],
      ["store/android/play-icon-512.png", 512],
    ]);
    for (const art of [...ICONS, ...STORE_ASSETS]) {
      const expected = sizes.get(art.path);
      if (!expected) continue;
      const drawn = art.draw();
      expect([art.path, drawn.width, drawn.height]).toEqual([art.path, expected, expected]);
    }
  });

  it("names each file once", () => {
    const paths = [...ICONS, ...STORE_ASSETS].map((a) => a.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("the encoder", () => {
  it("writes a PNG a decoder will recognise", () => {
    const png = encodePng(2, 2, new Uint8Array(16).fill(255));
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR: length 13, the tag, then width and height.
    expect([...png.subarray(8, 16)]).toEqual([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    expect(new DataView(png.buffer).getUint32(16)).toBe(2);
    expect(new DataView(png.buffer).getUint32(20)).toBe(2);
    expect(png[24]).toBe(8); // eight bits a channel
    expect(png[25]).toBe(6); // truecolour with alpha
  });

  it("declares sRGB, between the header and the pixels", () => {
    const png = encodePng(2, 2, new Uint8Array(16).fill(255));
    // IHDR ends at 33. The next chunk: length 1, the tag, intent 0.
    expect([...png.subarray(33, 42)]).toEqual([0, 0, 0, 1, 0x73, 0x52, 0x47, 0x42, 0]);
  });

  it("gives the same bytes for the same picture", () => {
    // What makes `pnpm icons` safe to run: an unchanged ramp leaves the working
    // tree clean, so a diff on an icon means the ramp actually moved.
    const once = encodePng(64, 64, icon({ size: 64, span: 0.7, background: BACKGROUND }).data);
    const again = encodePng(64, 64, icon({ size: 64, span: 0.7, background: BACKGROUND }).data);
    expect([...once]).toEqual([...again]);
  });

  it("refuses a buffer that is not the picture it was told to write", () => {
    expect(() => encodePng(4, 4, new Uint8Array(8))).toThrow(/expected 64 bytes/);
  });
});

describe("a Square's corners", () => {
  it("are rounded, and antialiased rather than stepped", () => {
    const art = canvas(40, 40);
    roundedRect(art, 4, 4, 32, 32, 8, [255, 0, 0]);
    expect(at(art, 20, 20)).toEqual([255, 0, 0, 255]); // the middle is filled
    expect(at(art, 4, 4)[3]).toBe(0); // the corner is cut away
    // Somewhere along the diagonal into the corner a pixel is partly covered.
    // Without that the corner is a staircase, which at 44px is the whole
    // difference. The diagonal, not the anti-diagonal: that one crosses the
    // arc's chord and never leaves the shape.
    const partial = [...Array(9).keys()].some((i) => {
      const a = at(art, 4 + i, 4 + i)[3]!;
      return a > 0 && a < 255;
    });
    expect(partial).toBe(true);
  });
});
