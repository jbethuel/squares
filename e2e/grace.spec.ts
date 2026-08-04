import { dayBefore, expect, habitRow, readDevice, test, total } from "./fixtures";

test.describe("the Grace Window", () => {
  test("says how many Habits yesterday is still open for", async ({ app }) => {
    const page = await app({ habits: ["workout", "read"] });
    await expect(
      page.getByRole("button", { name: /yesterday · 2 still open · closes at midnight/ }),
    ).toBeVisible();
  });

  test("stays collapsed until it is asked for", async ({ app }) => {
    const page = await app({ habits: ["workout"] });
    const strip = page.getByRole("button", { name: /yesterday · 1 still open/ });

    await expect(strip).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".row-yesterday")).toHaveCount(0);

    await strip.click();
    await expect(strip).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".row-yesterday")).toHaveCount(1);
  });

  test("records a Tick against yesterday, and then has nothing left to offer", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: /yesterday · 1 still open/ }).click();
    await page.locator(".row-yesterday").getByRole("button", { name: /^workout,/ }).click();

    await expect(page.getByRole("button", { name: /still open/ })).toHaveCount(0);
    await expect(total(page)).toHaveText("1");

    const data = await readDevice(page);
    expect(data.days[dayBefore(1)]?.ticked).toHaveLength(1);
    // Yesterday's Tick is yesterday's; today is untouched.
    expect(data.days[dayBefore(0)]?.ticked).toEqual([]);
  });

  test("keeps yesterday's Tick after a reload", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: /yesterday · 1 still open/ }).click();
    await page.locator(".row-yesterday").getByRole("button", { name: /^workout,/ }).click();
    await page.reload();

    await expect(total(page)).toHaveText("1");
    await expect(page.getByRole("button", { name: /still open/ })).toHaveCount(0);
  });

  test("is not offered on day one, when there is no yesterday to forget", async ({ app }) => {
    const page = await app({ age: 1, habits: ["workout"] });
    await expect(page.getByRole("button", { name: /yesterday/ })).toHaveCount(0);
  });

  test("offers no way at all to reach the Day before yesterday", async ({ app }) => {
    // Two Days ago was missed, and is closed permanently.
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [1] } });

    await expect(page.getByRole("button", { name: /still open/ })).toHaveCount(0);

    // Nothing tappable anywhere on Home refers to a Day older than yesterday.
    const labels = await page.getByRole("button").evaluateAll((nodes) =>
      nodes.map((n) => `${n.getAttribute("aria-label") ?? ""} ${n.textContent ?? ""}`),
    );
    const closed = new Date();
    closed.setDate(closed.getDate() - 2);
    const closedDay = String(closed.getDate());
    expect(labels.some((label) => label.includes(`${closedDay} `) && /ticked for/.test(label))).toBe(false);

    // And the record for that Day is still empty afterwards.
    expect((await readDevice(page)).days[dayBefore(2)]?.ticked).toEqual([]);
  });

  test("does not let a Tick from two Days ago be undone either", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [2] } });
    await expect(total(page)).toHaveText("1");

    // The only rows on Home are today's; tapping one cannot reach a closed Day.
    await habitRow(page, "workout").click();
    await expect(total(page)).toHaveText("2");
    expect((await readDevice(page)).days[dayBefore(2)]?.ticked).toHaveLength(1);
  });
});
