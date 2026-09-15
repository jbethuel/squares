import { toRgb, type Oklch } from "@squares/domain/palette";

/** Straight 8-bit RGB. `toRgb` in the palette already gives this shape. */
export type Rgb = readonly [number, number, number];

export interface Canvas {
  readonly width: number;
  readonly height: number;
  /** Row-major, 8-bit, non-premultiplied RGBA. */
  readonly data: Uint8Array;
}

export const rgbOf = (colour: Oklch): Rgb => toRgb(colour);

/** A canvas, transparent unless a fill is named. */
export function canvas(width: number, height: number, fill?: Rgb): Canvas {
  const data = new Uint8Array(width * height * 4);
  if (fill) {
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = fill[0];
      data[i * 4 + 1] = fill[1];
      data[i * 4 + 2] = fill[2];
      data[i * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

/**
 * Signed distance from a point to a rounded rectangle: negative inside,
 * positive outside, and in pixels either way.
 *
 * Coverage comes from the distance rather than from sampling the shape a few
 * times per pixel. A rounded corner is the only curve in any of this artwork,
 * and at icon sizes a stair-stepped one is the difference between a drawn mark
 * and a rendered one.
 */
function distance(
  px: number,
  py: number,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
): number {
  const qx = Math.abs(px - cx) - (halfWidth - radius);
  const qy = Math.abs(py - cy) - (halfHeight - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

/**
 * Paint a rounded rectangle, source-over.
 *
 * Only the rows and columns the shape can reach are visited. The feature
 * graphic is 133 of these on a canvas of half a million pixels, and walking all
 * of it per Square would be 133 times the work for the same picture.
 */
export function roundedRect(
  target: Canvas,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  colour: Rgb,
): void {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);

  const x0 = Math.max(0, Math.floor(x - 1));
  const x1 = Math.min(target.width - 1, Math.ceil(x + width + 1));
  const y0 = Math.max(0, Math.floor(y - 1));
  const y1 = Math.min(target.height - 1, Math.ceil(y + height + 1));

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      // The pixel's centre, not its corner: sampling at the corner shifts every
      // edge half a pixel up and left, which is visible on a 44px Square.
      const d = distance(px + 0.5, py + 0.5, cx, cy, halfWidth, halfHeight, r);
      const alpha = Math.min(Math.max(0.5 - d, 0), 1);
      if (alpha <= 0) continue;

      const at = (py * target.width + px) * 4;
      const under = target.data[at + 3]! / 255;
      const over = alpha + under * (1 - alpha);
      for (let channel = 0; channel < 3; channel++) {
        const src = colour[channel]!;
        const dst = target.data[at + channel]!;
        // Composited in straight alpha, so a Square drawn on a transparent
        // canvas keeps its own colour at the edge instead of fading toward
        // black — which is what the adaptive icon's foreground layer needs.
        target.data[at + channel] = Math.round(
          over === 0 ? 0 : (src * alpha + dst * under * (1 - alpha)) / over,
        );
      }
      target.data[at + 3] = Math.round(over * 255);
    }
  }
}
