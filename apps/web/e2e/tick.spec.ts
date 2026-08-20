import { dayBefore, expect, habitRow, readDevice, test, today, total } from "./fixtures";

test.describe("the whole app, one tap at a time", () => {
  test("starts empty, names a first Habit, and fills a Square", async ({ app }) => {
    const page = await app();

    await expect(page.getByText("three is the ceiling. start with one.")).toBeVisible();
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

  test("draws the year in full from day one, with no progress number", async ({ app }) => {
    const page = await app({ age: 1, habits: ["workout"] });

    await expect(page.getByText("ticks", { exact: true })).toBeVisible();

    // The frame is a calendar and does not grow into one: the same 365 Squares
    // on day one as on day 365, and still nothing counting down anywhere.
    await expect(page.locator(".heatmap .sq")).toHaveCount(53 * 7);
    await expect(page.locator(".heatmap .sq:not(.sq-pad)")).toHaveCount(365);
    await expect(page.locator(".sq-today")).toHaveCount(1);
  });

  /*
    The year used to be squeezed until 53 columns fitted the phone, which cost a
    Square most of its size once the weekday names took a gutter. It now keeps
    its size and runs off the side — but only inside its own scroller: the page
    itself must still never scroll sideways.
  */
  test("scrolls a settled year sideways, and never the page with it", async ({ app, page }) => {
    await app({ age: 365, habits: ["workout"] });

    await expect(page.locator(".heatmap .sq")).toHaveCount(53 * 7);

    const box = await page.locator(".axis-body").evaluate((el) => ({
      overflows: el.scrollWidth > el.clientWidth,
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(box.overflows).toBe(true);
    expect(box.page).toBe(false);
  });

  test("opens the year at today, not at the year before it", async ({ app, page }) => {
    await app({ age: 365, habits: ["workout"] });

    // The record reads the way it is written: today first, the year behind it.
    const at = await page
      .locator(".axis-body")
      .evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));
    expect(at.max).toBeGreaterThan(0);
    expect(at.left).toBe(at.max);

    // And today's Square is one you can actually see without scrolling.
    await expect(page.locator(".sq-today")).toBeInViewport();
  });

  test("opens a Habit's own year and comes back", async ({ app }) => {
    const page = await app({ age: 60, habits: ["workout"], ticks: { workout: [0, 1, 2] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    await expect(page.getByRole("heading", { name: "workout" })).toBeVisible();
    await expect(page.getByText("ticks", { exact: true })).toBeVisible();

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
