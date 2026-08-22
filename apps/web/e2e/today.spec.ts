import { dayBefore, expect, habitRow, readDevice, test, total } from "./fixtures";

test.describe("only today can be Logged (ADR 0002)", () => {
  test("offers no yesterday section at all", async ({ app }) => {
    const page = await app({ habits: ["workout", "read"] });
    await expect(page.getByRole("button", { name: /yesterday/ })).toHaveCount(0);
    await expect(page.locator(".row-yesterday")).toHaveCount(0);
  });

  test("records a Log against today, and nothing against yesterday", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await habitRow(page, "workout").click();
    await expect(total(page)).toHaveText("1");

    const data = await readDevice(page);
    expect(data.days[dayBefore(0)]?.logged).toHaveLength(1);
    expect(data.days[dayBefore(1)]).toBeUndefined();
  });

  test("keeps today's Log after a reload", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await habitRow(page, "workout").click();
    await page.reload();

    await expect(total(page)).toHaveText("1");
    await expect(habitRow(page, "workout")).toHaveAttribute("aria-pressed", "true");
  });

  test("un-logs today, right up to midnight", async ({ app }) => {
    const page = await app({ habits: ["workout"], logs: { workout: [0] } });
    await expect(total(page)).toHaveText("1");

    await habitRow(page, "workout").click();
    await expect(total(page)).toHaveText("0");
    // A Day with no Logs keeps no record at all.
    expect((await readDevice(page)).days[dayBefore(0)]).toBeUndefined();
  });

  test("offers no way at all to reach a Day that is not today", async ({ app }) => {
    // Yesterday was missed, and there is nothing to be done about it.
    const page = await app({ age: 30, habits: ["workout"], logs: { workout: [1] } });

    const labels = await page.getByRole("button").evaluateAll((nodes) =>
      nodes.map((n) => `${n.getAttribute("aria-label") ?? ""} ${n.textContent ?? ""}`),
    );
    const forADay = labels.filter((label) => /logged for/.test(label));
    const today = new Date();
    const todayDay = String(today.getDate());
    expect(forADay.length).toBeGreaterThan(0);
    expect(forADay.every((label) => label.includes(`${todayDay},`))).toBe(true);

    // Tapping the only row there is lands on today, never on the missed Day.
    await habitRow(page, "workout").click();
    const data = await readDevice(page);
    expect(data.days[dayBefore(0)]?.logged).toHaveLength(1);
    expect(data.days[dayBefore(1)]?.logged).toHaveLength(1);
  });

  test("does not let a Log from an earlier Day be undone", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], logs: { workout: [2] } });
    await expect(total(page)).toHaveText("1");

    // The only row on Home is today's; tapping it cannot reach a closed Day.
    await habitRow(page, "workout").click();
    await expect(total(page)).toHaveText("2");
    expect((await readDevice(page)).days[dayBefore(2)]?.logged).toHaveLength(1);
  });
});
