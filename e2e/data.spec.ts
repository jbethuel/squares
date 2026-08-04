import { readFile } from "node:fs/promises";
import { buildAccount, expect, habitRow, readDevice, test, total } from "./fixtures";

test.describe("the year lives on this device", () => {
  test("exports a file named for the Day, which parses back to the year", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout", "read"], ticks: { workout: [0, 1] } });

    await page.getByRole("button", { name: "settings" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "export .json" }).click();

    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^squares-\d{4}-\d{2}-\d{2}\.json$/);

    const contents = JSON.parse(await readFile((await file.path())!, "utf8"));
    expect(contents.version).toBe(1);
    expect(contents.habits.map((h: { name: string }) => h.name)).toEqual(["workout", "read"]);
    await expect(page.getByRole("status")).toHaveText("exported");
  });

  test("imports straight into a device with nothing to lose", async ({ app }) => {
    const page = await app({ habits: [] });
    const incoming = buildAccount({ age: 40, habits: ["read", "meditate"], ticks: { read: [0, 1, 2] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "squares.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(incoming)),
    });

    await expect(page.getByRole("status")).toHaveText("imported");
    await page.getByRole("button", { name: "‹ back" }).click();

    await expect(habitRow(page, "read")).toBeVisible();
    await expect(habitRow(page, "meditate")).toBeVisible();
    await expect(total(page)).toHaveText("3");
  });

  test("asks before replacing a year that already has something in it", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [0, 1] } });
    const incoming = buildAccount({ age: 40, habits: ["read", "meditate"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "squares.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(incoming)),
    });

    await expect(page.getByText(/replace this device's year with 2 habits and 40 days\?/)).toBeVisible();
    await expect(page.getByText(/not recoverable afterwards/)).toBeVisible();
    // Nothing has happened yet.
    expect((await readDevice(page)).habits.map((h) => h.name)).toEqual(["workout"]);

    await page.getByRole("button", { name: "keep mine" }).click();
    expect((await readDevice(page)).habits.map((h) => h.name)).toEqual(["workout"]);

    await page.getByRole("button", { name: "‹ back" }).click();
    await expect(habitRow(page, "workout")).toBeVisible();
    await expect(total(page)).toHaveText("2");
  });

  test("replaces the year when that is the answer", async ({ app }) => {
    const page = await app({ age: 30, habits: ["workout"], ticks: { workout: [0, 1] } });
    const incoming = buildAccount({ age: 40, habits: ["read"], ticks: { read: [0] } });

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "squares.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(incoming)),
    });
    await page.getByRole("button", { name: "replace" }).click();

    await expect(page.getByRole("status")).toHaveText("imported");
    await page.getByRole("button", { name: "‹ back" }).click();
    await expect(habitRow(page, "read")).toBeVisible();
    await expect(habitRow(page, "workout")).toHaveCount(0);
    await expect(total(page)).toHaveText("1");
  });

  test("refuses a file that is not a Squares export, and changes nothing", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ hello: "world" })),
    });

    await expect(page.getByRole("status")).toHaveText("that file is not a squares export");
    expect((await readDevice(page)).habits.map((h) => h.name)).toEqual(["workout"]);
  });

  test("refuses a file that is not JSON at all", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "year.json",
      mimeType: "application/json",
      buffer: Buffer.from("this is my year, honest"),
    });

    await expect(page.getByRole("status")).toHaveText("could not read that file");
    expect((await readDevice(page)).habits.map((h) => h.name)).toEqual(["workout"]);
  });

  test("does not carry a name opt-in in from a file that never set one", async ({ app }) => {
    const page = await app({ habits: [] });
    const today = new Date().toISOString().slice(0, 10);

    await page.getByRole("button", { name: "settings" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "old.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          installedOn: today,
          habits: [{ id: "h1", name: "took my meds", createdOn: today, archivedOn: null }],
          days: {},
          theme: "system",
        }),
      ),
    });

    await expect(page.getByRole("status")).toHaveText("imported");
    const data = await readDevice(page);
    expect(data.habits[0]?.sharedName).toBe(false);
    expect(data.habits[0]?.chained).toBe(false);
  });

  test("makes no network requests of its own", async ({ page, app }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("http://localhost") && !url.startsWith("data:") && !url.startsWith("blob:")) {
        external.push(url);
      }
    });

    const target = await app({ age: 60, habits: ["workout"], ticks: { workout: [0, 1] } });
    await target.getByRole("button", { name: "settings" }).click();
    await target.getByRole("button", { name: "make a share card ›" }).click();
    await expect(target.locator("canvas.share-preview")).toBeVisible();

    // No account, no sync, no analytics — and the font is self-hosted.
    expect(external).toEqual([]);
  });
});

test.describe("theme", () => {
  test("switches, and survives a reload", async ({ app }) => {
    const page = await app({ habits: ["workout"] });

    await page.getByRole("button", { name: "settings" }).click();
    await page.getByRole("button", { name: "light" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test.describe("on a device set to light", () => {
    test.use({ colorScheme: "light" });

    test("follows the system while the preference is system", async ({ app }) => {
      const page = await app({ habits: ["workout"] });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });

    test("is outranked by an explicit choice of dark", async ({ app }) => {
      const page = await app({ habits: ["workout"], theme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });
  });

  test.describe("on a device set to dark", () => {
    test.use({ colorScheme: "dark" });

    test("lands on dark, the designed theme", async ({ app }) => {
      const page = await app({ habits: ["workout"] });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });
  });
});
