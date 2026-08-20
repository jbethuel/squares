import { expect, test, today, total } from "./fixtures";
import { daysInMonth } from "@squares/domain/date";
import { lensDays } from "@squares/domain/lens";
import type { Page } from "@playwright/test";

/**
 * The Lens against a real browser. The date the suite runs on decides which
 * weekday the week opens on and how long the month is, so every expectation is
 * derived from the app's own rules rather than from a number written down on
 * the day this was added — a test that only passes in August is worse than none.
 */
const AGE = 60;

/** The Squares actually drawn: every Day the frame covers. */
const drawn = (page: Page) => page.locator(".heatmap .sq:not(.sq-pad)");
const lens = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

/** Rows the grid is actually laid out in, read off the resolved grid template. */
const rowCount = (page: Page) =>
  page
    .locator(".heatmap")
    .evaluate((el) => getComputedStyle(el).gridTemplateRows.split(/\s+/).filter(Boolean).length);

test.describe("the Lens", () => {
  test("opens on the year, which is the app", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"] });

    await expect(lens(page, "year")).toHaveAttribute("aria-pressed", "true");
    await expect(lens(page, "week")).toHaveAttribute("aria-pressed", "false");
    await expect(drawn(page)).toHaveCount(365);
  });

  test("draws a whole week as one row of the largest Squares in the app", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"], ticks: { workout: [0] } });

    await lens(page, "week").click();

    // Sunday to Saturday, left to right, whatever weekday it is — so the
    // Squares are always at the 40px cap here, and nothing spills out of it.
    await expect(drawn(page)).toHaveCount(7);
    await expect(page.locator(".heatmap .sq")).toHaveCount(7);
    expect(await rowCount(page)).toBe(1);

    const size = await page
      .locator(".heatmap")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--sq-size"));
    expect(parseFloat(size)).toBe(40);

    // One row means every Square shares a top edge and they run rightwards.
    // A single week has no second column for a weekday row to line up with,
    // so standing it on end wastes the width and reads as nothing.
    const boxes = await drawn(page).evaluateAll((els) =>
      els.map((el) => {
        const { x, y } = el.getBoundingClientRect();
        return { x, y };
      }),
    );
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
    expect(boxes[0]!.x).toBeLessThan(boxes[6]!.x);
  });

  test("keeps the month and the year as calendar blocks", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"] });

    // Only the Week is laid on its side. A frame of more than one week is drawn
    // as weekday rows, which lining up across columns is why the shape reads.
    await lens(page, "month").click();
    expect(await rowCount(page)).toBe(7);

    await lens(page, "year").click();
    expect(await rowCount(page)).toBe(7);
  });

  test("draws the whole month, however long this month is", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"] });

    await lens(page, "month").click();
    await expect(drawn(page)).toHaveCount(daysInMonth(today()));
    expect(lensDays("month", today())).toBe(daysInMonth(today()));

    await lens(page, "year").click();
    await expect(drawn(page)).toHaveCount(365);
  });

  test("draws the same frame however old the account is", async ({ app }) => {
    const page = await app({ age: 1, habits: ["workout"] });

    // Day one. The frame is a calendar, not a record of how long you have been here.
    await expect(drawn(page)).toHaveCount(365);
    await lens(page, "week").click();
    await expect(drawn(page)).toHaveCount(7);
  });

  test("never moves the Total, because the Total is the year's", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"], ticks: { workout: [0, 20, 40] } });
    await expect(total(page)).toHaveText("3");

    await lens(page, "week").click();

    // Two of those Ticks are off screen now. Nothing that can fall is on Home.
    await expect(drawn(page)).toHaveCount(7);
    await expect(total(page)).toHaveText("3");
  });

  test("never lets any Lens push the page sideways", async ({ app }) => {
    const page = await app({ age: 365, habits: ["workout"] });

    // The Year scrolls inside its own box; the page never does. A sideways page
    // takes the whole Screen with it, which is a different thing entirely.
    for (const name of ["week", "month", "year"]) {
      await lens(page, name).click();
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(scrolls, `${name} overflows the viewport`).toBe(false);
    }
  });

  test("fits the week and the month outright, and scrolls only the year", async ({ app }) => {
    const page = await app({ age: 365, habits: ["workout"] });
    const overflows = () =>
      page.locator(".axis-body").evaluate((el) => el.scrollWidth > el.clientWidth);

    // Seven Squares and five columns sit on a phone at the largest size the app
    // draws. Fitting 53 columns is what costs a Square its size.
    await lens(page, "week").click();
    expect(await overflows()).toBe(false);

    await lens(page, "month").click();
    expect(await overflows()).toBe(false);

    await lens(page, "year").click();
    expect(await overflows()).toBe(true);
  });

  test("is offered over a Habit's own Heatmap too", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"], ticks: { workout: [0] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    await expect(page.getByText("every day of the year · ticked or not")).toBeVisible();

    await lens(page, "week").click();

    await expect(page.getByText("every day of the week · ticked or not")).toBeVisible();
    await expect(drawn(page)).toHaveCount(7);
    // Today is marked here as well, so a Day still to come cannot be mistaken
    // for one that was missed.
    await expect(page.locator(".sq-today")).toHaveCount(1);
    // The stats above it stay on the year, so nothing on the screen can fall.
    await expect(page.getByText("ticks", { exact: true }).locator("xpath=preceding-sibling::div[1]")).toHaveText("1");
  });
});
