import { weekdayOf } from "@squares/domain/date";
import { expect, optIn, test, today } from "./fixtures";

/**
 * A card that leaks a name is the one unforgivable bug, so these drive the
 * real canvas: the PNG is decoded and compared against a card drawn with no
 * names at all, rather than trusting the sentence above the button.
 */
async function cardPixels(page: import("@playwright/test").Page): Promise<string> {
  const canvas = page.locator("canvas.share-preview");
  await expect(canvas).toBeVisible();
  return canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL("image/png"));
}

test.describe("the Share Card is anonymous by default", () => {
  test("says it carries no names, and draws none", async ({ app }) => {
    const page = await app({ age: 60, habits: ["took my meds", "no drinking"], ticks: { "took my meds": [0, 1] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByText(/no habit names on this card/)).toBeVisible();
    await expect(page.getByRole("img", { name: /no habit names/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /change what is named/ })).toHaveCount(0);
  });

  test("draws a name only once that Habit is opted in by hand", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout", "no drinking"], ticks: { workout: [0, 1] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();
    const anonymous = await cardPixels(page);

    // The opt-in lives on the Habit's own Screen now, so the route to it runs
    // out through Home rather than sideways within settings.
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "name on share card").click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByText("workout")).toBeVisible();
    await expect(page.getByText(/everything else stays anonymous/)).toBeVisible();
    await expect(page.getByRole("img", { name: /naming workout/ })).toBeVisible();

    // The drawing itself changed, not merely the sentence beside it.
    expect(await cardPixels(page)).not.toBe(anonymous);
  });

  test("names only what was opted in, never the Habit beside it", async ({ app }) => {
    const page = await app({
      age: 60,
      habits: ["workout", "no drinking"],
      sharedNames: ["workout"],
    });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    const label = await page.getByRole("img", { name: /Share card/ }).getAttribute("aria-label");
    expect(label).toContain("naming workout");
    expect(label).not.toContain("drinking");
    await expect(page.getByText("workout", { exact: true })).toBeVisible();
  });

  test("withdrawing the opt-in takes the name straight back off", async ({ app }) => {
    const page = await app({ age: 60, habits: ["took my meds"], sharedNames: ["took my meds"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();
    await expect(page.getByRole("img", { name: /naming took my meds/ })).toBeVisible();

    // The name on the card is the way to the switch that removes it: one tap
    // from the card that carries it to the control that withdraws it.
    await page.getByRole("button", { name: "took my meds", exact: true }).click();
    await optIn(page, "name on share card").click();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(page.getByRole("img", { name: /no habit names/ })).toBeVisible();
    await expect(page.getByText(/no habit names on this card/)).toBeVisible();
  });

  test("saves a PNG whose filename carries no date", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout"], ticks: { workout: [0, 1, 2] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "save .png" }).click();
    expect((await download).suggestedFilename()).toBe("squares.png");
    await expect(page.getByRole("status")).toHaveText("saved");
  });

  test("is reached from settings and not from Home", async ({ app }) => {
    const page = await app({ habits: ["workout"] });
    await expect(page.getByRole("button", { name: /share/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "settings" })).toBeVisible();
  });
});

/**
 * The card's Lens, against the real canvas. These read pixels rather than the
 * sentence beside the button, because the card is a drawing and the drawing is
 * what gets handed over.
 */
test.describe("the Share Card's own Lens", () => {
  /** A vertical strip of device pixels down the centre of a Week card column. */
  const columnTop = (page: import("@playwright/test").Page, column: number) =>
    page.locator("canvas.share-preview").evaluate((el, col) => {
      const canvas = el as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      // Card units: 320 wide, 22 pad, seven columns at a 4-unit gap.
      const scale = canvas.width / 320;
      const size = (276 - 6 * 4) / 7;
      const x = Math.round((22 + col * (size + 4) + size / 2) * scale);
      const pixels: string[] = [];
      for (let dy = 0; dy < 8; dy++) {
        const data = context.getImageData(x, Math.round(22 * scale) + dy, 1, 1).data;
        pixels.push(`${data[0]},${data[1]},${data[2]}`);
      }
      return pixels;
    }, column);

  test("draws a whole week, today ringed, on whatever day it is made", async ({ app, page }) => {
    // Ticked only well in the past, so today is empty and the ring is the only
    // thing separating a Day missed from a Day that has not happened.
    await app({ age: 200, habits: ["workout"], ticks: { workout: [30, 31] } });
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();
    await page.getByRole("button", { name: "week", exact: true }).click();

    await expect(page.getByRole("img", { name: /0 ticks across the week/ })).toBeVisible();

    // Today's Square carries a stroke its neighbours do not. A Week card used
    // to be however many Days had happened, which does not read as a week.
    //
    // The Week runs Sunday to Saturday, so today's column is its weekday. This
    // used to read column 0 and therefore only passed on a Sunday — on every
    // other day it compared two plain Squares and found them alike. The column
    // comes from the app's own rule rather than a second copy of it, the same
    // reason `fixtures.ts` builds its account with `sealDays`.
    const column = weekdayOf(today());
    const ringed = await columnTop(page, column);
    const plain = await columnTop(page, (column + 1) % 7);
    expect(new Set(ringed).size).toBeGreaterThan(new Set(plain).size);
    expect(ringed).not.toEqual(plain);
  });

  test("counts only what it drew, so the number matches the picture", async ({ app, page }) => {
    // Ticks spread across the year: the year sees them all, the week sees today.
    await app({ age: 200, habits: ["workout"], ticks: { workout: [0, 40, 80, 120] } });
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByRole("img", { name: /4 ticks across the year/ })).toBeVisible();
    const year = await cardPixels(page);

    await page.getByRole("button", { name: "week", exact: true }).click();
    await expect(page.getByRole("img", { name: /1 ticks across the week/ })).toBeVisible();

    // The drawing changed too, not just the sentence.
    expect(await cardPixels(page)).not.toBe(year);
  });

  test("opens on the year, which ends at today and needs no ring", async ({ app, page }) => {
    await app({ age: 200, habits: ["workout"] });
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByRole("button", { name: "year", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("img", { name: /across the year/ })).toBeVisible();
  });
});
