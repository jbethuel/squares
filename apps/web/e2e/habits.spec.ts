import { expect, habitName, habitRow, optIn, readDevice, test, total } from "./fixtures";

test.describe("keeping the list of Habits", () => {
  test("adds a second Habit without disturbing the first", async ({ app }) => {
    const page = await app({ habits: ["workout"], ticks: { workout: [0, 1] } });

    await page.getByRole("button", { name: "+ new habit" }).click();
    await page.getByLabel("name").fill("read");
    await page.getByRole("button", { name: "save" }).click();

    await expect(habitRow(page, "workout")).toHaveAttribute("aria-pressed", "true");
    await expect(habitRow(page, "read")).toHaveAttribute("aria-pressed", "false");
    await expect(total(page)).toHaveText("2");
  });

  test("refuses to save a Habit with no name", async ({ app }) => {
    const page = await app({ habits: [] });

    await page.getByRole("button", { name: "name your first habit" }).click();
    await expect(page.getByRole("button", { name: "save" })).toBeDisabled();

    await page.getByLabel("name").fill("   ");
    await expect(page.getByRole("button", { name: "save" })).toBeDisabled();
  });

  test("renames a Habit where the name is, and the Ticks follow it", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [0, 1, 3] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    // The heading is the field. There is no save to press: leaving it is the
    // commit, and a blank field puts the old name back.
    await habitName(page).fill("lift");
    await habitName(page).blur();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "lift")).toBeVisible();
    await expect(total(page)).toHaveText("3");
    await expect(habitRow(page, "lift")).toHaveAttribute("aria-pressed", "true");
  });

  test("archives on one tap, with nothing to confirm", async ({ app }) => {
    // Ticked on closed Days only: Archive retires the Habit from today forward,
    // so a Tick made *today* goes with it, but the past does not move.
    const page = await app({ age: 30, habits: ["workout", "read"], ticks: { workout: [2, 3] } });

    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "archive").click();

    // The switch is reversible, so it asks nothing first and goes nowhere after.
    await expect(optIn(page, "archive")).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "read")).toBeVisible();
    await expect(habitRow(page, "workout")).toHaveCount(0);
    // Every past Tick stays in the year, and in the Total. There is no delete.
    await expect(total(page)).toHaveText("2");
    expect((await readDevice(page)).habits).toHaveLength(2);
  });

  test("takes a Habit back out of the Archive, through settings", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout", "read"], archived: ["read"] });
    await expect(habitRow(page, "read")).toHaveCount(0);

    // Settings holds the only route to a Habit Home no longer lists.
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "read ›" }).click();
    await expect(optIn(page, "archive")).toHaveAttribute("aria-checked", "true");

    await optIn(page, "archive").click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "read")).toBeVisible();
    // This account was Archived at today, so taking it back today is the
    // same-Day undo: one open Span rather than a zero-length gap. The case
    // where the gap is real is held in `mutations.test.ts`.
    expect((await readDevice(page)).habits.find((h) => h.name === "read")?.spans).toEqual([
      { from: expect.any(String), to: null },
    ]);
  });

  test("shows an Archived Habit only what still applies to it", async ({ app }) => {
    const page = await app({ habits: ["workout", "read"], archived: ["read"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "read ›" }).click();

    // Neither the Card nor the Chain applies while it is Archived, so neither
    // switch is on the Screen to sit there doing nothing.
    await expect(optIn(page, "count a chain")).toHaveCount(0);
    await expect(optIn(page, "name on share card")).toHaveCount(0);
    await expect(optIn(page, "archive")).toBeVisible();
  });
});

test.describe("Chains are opt-in", () => {
  test("show nothing that can go to zero until they are turned on", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [0, 1, 2] } });

    await expect(page.getByText("3 ticks · unchained")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    await page.getByRole("switch", { name: /count a chain/ }).click();
    await expect(page.getByText("longest")).toBeVisible();

    await page.getByRole("button", { name: "‹ back" }).click();
    await expect(page.getByText("chain 3 days")).toBeVisible();
  });

  test("break on a missed Day and are not repaired", async ({ app }) => {
    const page = await app({
      age: 30,
      habits: ["workout"],
      ticks: { workout: [2, 3, 4] },
      chained: ["workout"],
    });

    // Yesterday was missed, so the Chain is over even though today is open.
    await expect(page.getByText("chain broken")).toBeVisible();

    await habitRow(page, "workout").click();
    await expect(page.getByText("chain 1 day")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    // The longest Chain is remembered; the current one starts again at 1.
    await expect(page.locator(".stat-value").first()).toHaveText("1");
    await expect(page.getByText("longest").locator("xpath=preceding-sibling::*[1]")).toHaveText("3");
  });

  test("can be turned back off on the Habit's own screen, leaving the count", async ({ app }) => {
    const page = await app({
      age: 30,
      habits: ["workout"],
      ticks: { workout: [0, 1] },
      chained: ["workout"],
    });
    await expect(page.getByText("chain 2 days")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "count a chain").click();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(page.getByText("2 ticks · unchained")).toBeVisible();
  });
});
