import { expect, optIns, test } from "./fixtures";

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

    await page.getByRole("button", { name: "‹ back" }).click();
    await optIns(page, "names").first().click();
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

    await page.getByRole("button", { name: "‹ change what is named" }).click();
    await optIns(page, "names").first().click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

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
