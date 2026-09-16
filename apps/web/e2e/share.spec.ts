import { weekdayOf } from "@squares/domain/date";
import { expect, optIn, test, today } from "./fixtures";

/**
 * ADR 0010: naming is unconditional, so these drive the real canvas — the PNG
 * is decoded and compared against a card drawn with a different set of
 * Habits, rather than trusting the sentence above the button.
 */
async function cardPixels(page: import("@playwright/test").Page): Promise<string> {
  const canvas = page.locator("canvas.share-preview");
  await expect(canvas).toBeVisible();
  return canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL("image/png"));
}

test.describe("the Share Card names every visible Habit", () => {
  test("names every Habit, with nothing withheld", async ({ app }) => {
    const page = await app({
      age: 60,
      habits: ["took my meds", "no drinking"],
      logs: { "took my meds": [0, 1] },
    });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByText("this card names took my meds, no drinking.")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /naming took my meds, no drinking/ }),
    ).toBeVisible();
  });

  test("drops a Habit's name, and its Squares, the moment it is Hidden", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout", "no drinking"], logs: { workout: [0, 1] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();
    const both = await cardPixels(page);

    // Hide lives on the Habit's own Screen, so the route to it runs out
    // through Home rather than sideways within settings.
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "Open no drinking" }).click();
    await optIn(page, "hide").click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByText("this card names workout.")).toBeVisible();
    await expect(page.getByRole("img", { name: /naming workout/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /drinking/ })).toHaveCount(0);

    // The drawing itself changed, not merely the sentence beside it.
    expect(await cardPixels(page)).not.toBe(both);
  });

  test("saves a PNG whose filename carries no date", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout"], logs: { workout: [0, 1, 2] } });

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

test.describe("the Habit Card names only its own Habit", () => {
  test("is reached from the Habit's own Screen, and names only that Habit", async ({ app }) => {
    const page = await app({
      age: 60,
      habits: ["workout", "no drinking"],
      logs: { workout: [0, 1] },
    });

    await page.getByRole("button", { name: "Open workout" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByRole("heading", { name: "share workout" })).toBeVisible();
    await expect(page.getByText("this card names workout.")).toBeVisible();
    await expect(page.getByRole("img", { name: /naming workout/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /drinking/ })).toHaveCount(0);
  });

  test("offers no such link once the Habit is Hidden", async ({ app }) => {
    const page = await app({ habits: ["workout"] });
    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "hide").click();
    await expect(page.getByRole("button", { name: "make a share card ›" })).toHaveCount(0);
  });

  test("shows the Streak once the Habit opts in, matching its own Screen", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], logs: { workout: [0] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "count a streak").click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    // The Streak is drawn onto the canvas itself and read back through the
    // accessible label, the same way the names line already is.
    await expect(page.getByRole("img", { name: /naming workout, a 1-day streak/ })).toBeVisible();
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

  test("draws a whole week, and rings today wherever the Frame runs past it", async ({
    app,
    page,
  }) => {
    // Logged only well in the past, so today is empty and the ring is the only
    // thing separating a Day missed from a Day that has not happened.
    await app({ age: 200, habits: ["workout"], logs: { workout: [30, 31] } });
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();
    await page.getByRole("button", { name: "week", exact: true }).click();

    await expect(page.getByRole("img", { name: /0 logs across the week/ })).toBeVisible();

    // The Week runs Sunday to Saturday, so today's column is its weekday, and
    // the column is taken from the app's own rule rather than a second copy.
    const column = weekdayOf(today());
    const ringed = await columnTop(page, column);
    const plain = await columnTop(page, (column + 6) % 7);

    // The ring exists to tell a missed Day from one that has not happened, so
    // it is drawn only where the Frame actually runs past today. On a Saturday
    // the week ends at today and there is nothing ahead of it to disambiguate.
    if (column === 6) {
      expect(ringed).toEqual(plain);
    } else {
      expect(new Set(ringed).size).toBeGreaterThan(new Set(plain).size);
      expect(ringed).not.toEqual(plain);
    }
  });

  test("counts only what it drew, so the number matches the picture", async ({ app, page }) => {
    // Logs spread across the year: the year sees them all, the week sees today.
    await app({ age: 200, habits: ["workout"], logs: { workout: [0, 40, 80, 120] } });
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "make a share card ›" }).click();

    await expect(page.getByRole("img", { name: /4 logs across the year/ })).toBeVisible();
    const year = await cardPixels(page);

    await page.getByRole("button", { name: "week", exact: true }).click();
    await expect(page.getByRole("img", { name: /1 logs across the week/ })).toBeVisible();

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
