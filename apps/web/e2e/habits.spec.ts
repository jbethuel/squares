import { expect, habitName, habitRow, optIn, readDevice, test, total } from "./fixtures";

test.describe("keeping the list of Habits", () => {
  test("adds a second Habit without disturbing the first", async ({ app }) => {
    const page = await app({ habits: ["workout"], logs: { workout: [0, 1] } });

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

  test("renames a Habit where the name is, and the Logs follow it", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], logs: { workout: [0, 1, 3] } });

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

  test("hides on one tap, with nothing to confirm", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout", "read"], logs: { workout: [2, 3] } });
    await expect(total(page)).toHaveText("2");

    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "hide").click();

    // The switch is reversible, so it asks nothing first and goes nowhere after.
    await expect(optIn(page, "hide")).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "read")).toBeVisible();
    await expect(habitRow(page, "workout")).toHaveCount(0);
    // ADR 0001: the Overview is a projection over the visible Habits, so the
    // Logs leave the Total with the Habit. Nothing is deleted — every Log is
    // still on the device, and comes back when the Habit does.
    await expect(total(page)).toHaveText("0");
    const data = await readDevice(page);
    expect(data.habits).toHaveLength(2);
    expect(Object.values(data.days).flatMap((d) => d.logged)).toHaveLength(2);
  });

  test("brings a Hidden Habit back, through settings", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout", "read"], hidden: ["read"] });
    await expect(habitRow(page, "read")).toHaveCount(0);

    // Settings holds the only route to a Habit Home no longer lists.
    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "read ›" }).click();
    await expect(optIn(page, "hide")).toHaveAttribute("aria-checked", "true");

    await optIn(page, "hide").click();
    await page.getByRole("button", { name: "‹ back" }).click();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "read")).toBeVisible();
    // This account was Hidden at today, so taking it back today is the
    // same-Day undo: one open Span rather than a zero-length gap. The case
    // where the gap is real is held in `mutations.test.ts`.
    expect((await readDevice(page)).habits.find((h) => h.name === "read")?.spans).toEqual([
      { from: expect.any(String), to: null },
    ]);
  });

  test("shows a Hidden Habit only what still applies to it", async ({ app }) => {
    const page = await app({ habits: ["workout", "read"], hidden: ["read"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "read ›" }).click();

    // Neither the Card nor the Streak applies while it is Hidden, so neither
    // switch is on the Screen to sit there doing nothing.
    await expect(optIn(page, "count a streak")).toHaveCount(0);
    await expect(optIn(page, "name on share card")).toHaveCount(0);
    await expect(optIn(page, "hide")).toBeVisible();
  });
});

test.describe("Streaks are opt-in", () => {
  test("show nothing that can go to zero until they are turned on", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], logs: { workout: [0, 1, 2] } });

    await expect(page.getByText("3 logs")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    await page.getByRole("switch", { name: /count a streak/ }).click();
    await expect(page.getByText("longest")).toBeVisible();

    await page.getByRole("button", { name: "‹ back" }).click();
    await expect(page.getByText("streak 3 days")).toBeVisible();
  });

  test("break on a missed Day and are not repaired", async ({ app }) => {
    const page = await app({
      age: 30,
      habits: ["workout"],
      logs: { workout: [2, 3, 4] },
      streaks: ["workout"],
    });

    // Yesterday was missed, so the Streak is over even though today is open.
    await expect(page.getByText("streak broken")).toBeVisible();

    await habitRow(page, "workout").click();
    await expect(page.getByText("streak 1 day")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    // The longest Streak is remembered; the current one starts again at 1.
    await expect(page.locator(".stat-value").first()).toHaveText("1");
    await expect(page.getByText("longest").locator("xpath=preceding-sibling::*[1]")).toHaveText("3");
  });

  test("can be turned back off on the Habit's own screen, leaving the count", async ({ app }) => {
    const page = await app({
      age: 30,
      habits: ["workout"],
      logs: { workout: [0, 1] },
      streaks: ["workout"],
    });
    await expect(page.getByText("streak 2 days")).toBeVisible();

    await page.getByRole("button", { name: "Open workout" }).click();
    await optIn(page, "count a streak").click();
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(page.getByText("2 logs")).toBeVisible();
  });
});
