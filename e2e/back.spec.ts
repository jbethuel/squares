import { expect, habitRow, test } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * The way out, across the phones this actually runs on.
 *
 * Two things are guarded here that nothing else guards. First, vertical fit:
 * the "no scrolling" assertions in `tick.spec.ts` and `lens.spec.ts` compare
 * scrollWidth to clientWidth and so only ever caught *horizontal* overflow —
 * the fixed bar costs height, and height was unguarded. Second, Android. iOS
 * standalone has no back button behind the bar at all, but Android keeps its
 * system back, so the two have to agree rather than fight.
 */
const PHONES = [
  // The floor. If the year and the bar fit here they fit everywhere.
  { name: "android, small", width: 360, height: 640 },
  { name: "android, pixel", width: 412, height: 915 },
  { name: "iphone", width: 390, height: 844 },
];

/** The gap between the last thing on the Screen and the top of the bar. */
async function gapBelowContent(page: Page): Promise<number | null> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  return page.evaluate(() => {
    const bar = document.querySelector(".backbar");
    if (!bar) return null;
    const content = [...(document.querySelector(".app")?.children ?? [])].filter(
      (el) => !el.classList.contains("backbar"),
    );
    const last = content[content.length - 1]?.getBoundingClientRect().bottom ?? 0;
    return Math.round(bar.getBoundingClientRect().top - last);
  });
}

const scrollsVertically = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );

const openHabit = (page: Page, name: string) =>
  habitRow(page, name).locator("xpath=..").getByRole("button").last().click();

for (const phone of PHONES) {
  test.describe(phone.name, () => {
    test.use({ viewport: { width: phone.width, height: phone.height } });

    test("keeps Home on one screen, bar or no bar", async ({ app, page }) => {
      await app({ age: 365, habits: ["workout", "read", "meds"] });

      // Home carries no bar — it is the one Screen there is no leaving.
      await expect(page.getByRole("button", { name: "‹ back" })).toHaveCount(0);
      expect(await scrollsVertically(page)).toBe(false);
    });

    test("never lets the bar cover the end of a Screen", async ({ app, page }) => {
      await app({ age: 365, habits: ["workout", "read", "meds"] });

      await openHabit(page, "workout");
      expect(await gapBelowContent(page)).toBeGreaterThanOrEqual(0);

      await page.getByRole("button", { name: "‹ back" }).click();
      // Settings is the long one: several screens of scroll, so it is the only
      // place the last line can end up underneath a fixed bar.
      await page.getByRole("button", { name: "settings" }).click();
      expect(await scrollsVertically(page)).toBe(true);
      expect(await gapBelowContent(page)).toBeGreaterThanOrEqual(0);

      await page.getByRole("button", { name: "make a share card ›" }).click();
      expect(await gapBelowContent(page)).toBeGreaterThanOrEqual(0);
    });

    test("agrees with Android's own back button", async ({ app, page }) => {
      await app({ age: 30, habits: ["workout"] });

      await page.getByRole("button", { name: "settings" }).click();
      await expect(page.getByRole("heading", { name: "settings" })).toBeVisible();

      // Android's hardware or gesture back is exactly a history pop, which is
      // the same thing the bar does — so it lands in the same place, and takes
      // the bar with it.
      await page.goBack();
      await expect(page.getByRole("button", { name: "settings" })).toBeVisible();
      await expect(page.getByRole("button", { name: "‹ back" })).toHaveCount(0);
    });

    test("lets the system back and the bar unwind the same stack", async ({ app, page }) => {
      await app({ age: 30, habits: ["workout"] });

      await openHabit(page, "workout");
      await page.getByRole("button", { name: "edit" }).click();
      await expect(page.getByLabel("name")).toBeVisible();

      await page.goBack();
      await expect(page.getByRole("heading", { name: "workout" })).toBeVisible();

      await page.getByRole("button", { name: "‹ back" }).click();
      await expect(page.getByRole("button", { name: "settings" })).toBeVisible();
    });
  });
}
