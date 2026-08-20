import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Comments are stripped so prose above a rule can never read as a selector. */
const CSS = readFileSync(new URL("./globals.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/**
 * The floor itself is explained where it is written, in `globals.css`. What is
 * worth saying here is why it is guarded by reading the stylesheet: nothing in
 * CI can watch the zoom happen. Playwright drives Chromium, which has no focus
 * zoom, and the jsdom project never loads this stylesheet at all.
 */
const FLOOR_PX = 16;
const CONTROLS = ["input", "textarea", "select"] as const;
/** Derived, so a control added above cannot fall out of the filter below. */
const TEXT_CONTROL = new RegExp(
  [...CONTROLS.map((control) => `\\b${control}\\b`), String.raw`\.field(?![\w-])`].join("|"),
);

/** Innermost blocks only: `@media` and `@keyframes` wrappers never match. */
function textControlRules() {
  return [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selector: match[1]!.trim(), body: match[2]! }))
    .filter((rule) => TEXT_CONTROL.test(rule.selector));
}

/**
 * Every declared size, whatever the unit. A size only clears the floor if it is
 * a literal px at or above it — `rem` is treated as a failure rather than
 * ignored, because a user who has *lowered* their default text size computes it
 * back under the threshold, which is the whole reason px was chosen.
 */
function sizesUnderFloor(body: string) {
  return [...body.matchAll(/font-size:\s*([^;}]+)/g)]
    .map((match) => match[1]!.trim())
    .filter((size) => !clearsFloor(size));
}

function clearsFloor(size: string) {
  const px = /^(\d+(?:\.\d+)?)px$/.exec(size);
  return px !== null && Number(px[1]) >= FLOOR_PX;
}

describe("typography", () => {
  it("puts a 16px floor under every kind of text control", () => {
    // Not just the one field that exists today. `button, input { font: inherit }`
    // resolves an unstyled input to the 13px body, so a control added later
    // without the field class would quietly bring the zoom back.
    for (const control of CONTROLS) {
      const covered = textControlRules()
        .filter((rule) => new RegExp(`\\b${control}\\b`).test(rule.selector))
        .flatMap((rule) => [...rule.body.matchAll(/font-size:\s*([^;}]+)/g)])
        .some((match) => clearsFloor(match[1]!.trim()));
      expect(covered, `no floor covers <${control}>`).toBe(true);
    }
  });

  it("lets nothing more specific pull a text control back under it", () => {
    // The bug's original shape: a class on the field beating the element rule
    // on specificity. A floor that only checks the element rule would have
    // passed while the page still zoomed.
    const under = textControlRules().flatMap((rule) =>
      sizesUnderFloor(rule.body).map((size) => `${rule.selector} { font-size: ${size} }`),
    );
    expect(under).toEqual([]);
  });
});
