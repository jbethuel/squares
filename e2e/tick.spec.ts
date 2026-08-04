import { dayBefore, expect, habitRow, readDevice, test, today, total } from "./fixtures";

test.describe("the whole app, one tap at a time", () => {
  test("starts empty, names a first Habit, and fills a Square", async ({ app }) => {
    const page = await app();

    await expect(page.getByText("two or three is the honest ceiling. start with one.")).toBeVisible();
    await expect(total(page)).toHaveText("0");

    await page.getByRole("button", { name: "name your first habit" }).click();
    await page.getByLabel("name").fill("workout");
    await page.getByRole("button", { name: "save" }).click();

    const row = habitRow(page, "workout");
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("aria-pressed", "false");

    await row.click();

    await expect(row).toHaveAttribute("aria-pressed", "true");
    await expect(total(page)).toHaveText("1");
    expect((await readDevice(page)).days[today()]?.ticked).toHaveLength(1);
  });

  test("keeps the year across a reload, because it lives on the device", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout", "read"] });

    await habitRow(page, "workout").click();
    await expect(total(page)).toHaveText("1");

    await page.reload();

    await expect(habitRow(page, "workout")).toHaveAttribute("aria-pressed", "true");
    await expect(habitRow(page, "read")).toHaveAttribute("aria-pressed", "false");
    await expect(total(page)).toHaveText("1");
  });

  test("takes a Tick back, and the Total with it", async ({ app }) => {
    const page = await app({ habits: ["workout"], ticks: { workout: [0] } });
    await expect(total(page)).toHaveText("1");

    await habitRow(page, "workout").click();

    await expect(habitRow(page, "workout")).toHaveAttribute("aria-pressed", "false");
    await expect(total(page)).toHaveText("0");
    await page.reload();
    await expect(total(page)).toHaveText("0");
  });

  test("shades today's Square in the Overview as the Day fills up", async ({ app }) => {
    const page = await app({ habits: ["a", "b", "c", "d"] });
    const todaySquare = page.locator(".sq-today, .sq-echo").first();

    await expect(todaySquare).toHaveCSS("background-color", /.+/);
    const empty = await todaySquare.evaluate((el) => getComputedStyle(el).backgroundColor);

    await habitRow(page, "a").click();
    await habitRow(page, "b").click();
    const half = await todaySquare.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(half).not.toBe(empty);

    await habitRow(page, "c").click();
    await habitRow(page, "d").click();
    const full = await todaySquare.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(full).not.toBe(half);

    // A full-shade Square means a complete Day at any Habit count.
    await expect(total(page)).toHaveText("4");
  });

  test("widens the grid instead of showing a progress number", async ({ app }) => {
    const page = await app({ age: 1, habits: ["workout"] });

    await expect(page.getByText("installed today")).toBeVisible();
    await expect(page.getByText("tap a square. that is the whole app.")).toBeVisible();

    // Day one is a single column: one lived Square at its largest, the rest of
    // the week ghosted. The widening is the only progress indicator there is.
    await expect(page.locator(".heatmap .sq")).toHaveCount(7);
    await expect(page.locator(".heatmap .sq:not(.sq-future):not(.sq-unborn)")).toHaveCount(1);

    const size = await page
      .locator(".heatmap")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--sq-size"));
    expect(parseFloat(size)).toBe(40);
  });

  test("fits a settled year on a phone with no scrolling", async ({ app }) => {
    const page = await app({ age: 365, habits: ["workout"] });

    await expect(page.getByText("53 weeks, no scrolling")).toBeVisible();
    await expect(page.locator(".heatmap .sq")).toHaveCount(53 * 7);

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(scrolls).toBe(false);
  });

  test("opens a Habit's own year and comes back", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout"], ticks: { workout: [0, 1, 2] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    await expect(page.getByRole("heading", { name: "workout" })).toBeVisible();
    await expect(page.getByText("total ticks")).toBeVisible();

    await page.getByRole("button", { name: "‹ back" }).click();
    await expect(habitRow(page, "workout")).toBeVisible();
  });

  test("survives the browser's back button rather than leaving the app", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: "settings" }).click();
    await expect(page.getByRole("heading", { name: "settings" })).toBeVisible();

    await page.goBack();
    await expect(habitRow(page, "workout")).toBeVisible();
  });
});
