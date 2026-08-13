import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Comments are stripped so prose above a rule can never read as a selector. */
const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/**
 * iOS Safari zooms the page in when a focused text control computes under 16px
 * and never zooms back out, which strands the Overview Heatmap cropped after
 * naming a Habit. Nothing in CI can watch that happen — Playwright drives
 * Chromium, which has no focus zoom, and the jsdom project never loads this
 * stylesheet at all — so the rule is guarded where it is written instead.
 */
const FLOOR_PX = 16;
const CONTROLS = ["input", "textarea", "select"] as const;
const TEXT_CONTROL = /\binput\b|\btextarea\b|\bselect\b|\.field\b/;

/** Innermost blocks only: `@media` and `@keyframes` wrappers never match. */
function textControlRules() {
  return [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selector: match[1]!.trim(), body: match[2]! }))
    .filter((rule) => TEXT_CONTROL.test(rule.selector));
}

function declaredSizes(body: string) {
  return [...body.matchAll(/font-size:\s*([\d.]+)px/g)].map((match) => Number(match[1]));
}

describe("typography", () => {
  it("puts a 16px floor under every kind of text control", () => {
    // Not just the one field that exists today. `button, input { font: inherit }`
    // resolves an unstyled input to the 13px body, so a control added later
    // without the field class would quietly bring the zoom back.
    for (const control of CONTROLS) {
      const sizes = textControlRules()
        .filter((rule) => new RegExp(`\\b${control}\\b`).test(rule.selector))
        .flatMap((rule) => declaredSizes(rule.body));
      expect(sizes.some((px) => px >= FLOOR_PX), `no floor covers <${control}>`).toBe(true);
    }
  });

  it("lets nothing more specific pull a text control back under it", () => {
    // The bug's original shape: a class on the field beating the element rule
    // on specificity. A floor that only checks the element rule would have
    // passed while the page still zoomed.
    const under = textControlRules().flatMap((rule) =>
      declaredSizes(rule.body)
        .filter((px) => px < FLOOR_PX)
        .map((px) => `${rule.selector} { font-size: ${px}px }`),
    );
    expect(under).toEqual([]);
  });
});
