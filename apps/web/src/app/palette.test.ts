import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokensCss } from "./tokens";

/**
 * The ramp has one definition — `@squares/domain/palette` — and the stylesheet
 * is output, not source. So this no longer compares numbers to numbers, which
 * only ever covered the Dark ramp and would have needed extending for every new
 * consumer. It asserts the committed file is what the generator produces, which
 * covers both ramps and every character between them.
 */
describe("the generated Intensity tokens", () => {
  it("are committed exactly as the generator writes them", () => {
    const committed = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
    expect(committed).toBe(tokensCss());
  });

  it("are the only place the ramp is declared", () => {
    const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
    expect(globals).not.toMatch(/--lv\d\s*:/);
    expect(globals).toMatch(/@import\s+"\.\/tokens\.css"/);
  });
});
