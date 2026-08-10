import { expect, test, today, total } from "./fixtures";
import { daysInMonth } from "../src/domain/date";
import { lensDays } from "../src/domain/lens";
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

test.describe("the Lens", () => {
  test("opens on the year, which is the app", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"] });

    await expect(lens(page, "year")).toHaveAttribute("aria-pressed", "true");
    await expect(lens(page, "week")).toHaveAttribute("aria-pressed", "false");
    await expect(drawn(page)).toHaveCount(365);
  });

  test("draws a whole week as one column of the largest Squares in the app", async ({ app }) => {
    const page = await app({ age: AGE, habits: ["workout"], ticks: { workout: [0] } });

    await lens(page, "week").click();

    // Sunday to Saturday is one column whatever weekday it is, so the Squares
    // are always at the 40px cap here — and nothing spills out of it.
    await expect(drawn(page)).toHaveCount(7);
    await expect(page.locator(".heatmap .sq")).toHaveCount(7);
    const size = await page
      .locator(".heatmap")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--sq-size"));
    expect(parseFloat(size)).toBe(40);
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

  test("still fits the phone at every Lens, with no scrolling", async ({ app }) => {
    const page = await app({ age: 365, habits: ["workout"] });

    for (const name of ["week", "month", "year"]) {
      await lens(page, name).click();
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(scrolls, `${name} overflows the viewport`).toBe(false);
    }
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
    await expect(page.getByText("total ticks").locator("xpath=preceding-sibling::div[1]")).toHaveText("1");
  });
});
