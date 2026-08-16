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
/*
 * `fitsHome` is whether Home still sits on one screen at its fullest — three
 * Habits and a settled year. It stopped being true everywhere when the Year
 * took a Square worth looking at: seven rows of 11px is 95px where seven rows
 * of 4.96px was 42px, and the floor phone runs about 30px over. The two phones
 * people actually carry still fit.
 */
const PHONES = [
  // The floor. If the bar fits here it fits everywhere.
  { name: "android, small", width: 360, height: 640, fitsHome: false },
  { name: "android, pixel", width: 412, height: 915, fitsHome: true },
  { name: "iphone", width: 390, height: 844, fitsHome: true },
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

    test("carries no bar, and keeps to one screen where it fits", async ({ app, page }) => {
      await app({ age: 365, habits: ["workout", "read", "meds"] });

      // Home carries no bar — it is the one Screen there is no leaving. That
      // holds on every phone; the one-screen part now holds on all but the floor.
      await expect(page.getByRole("button", { name: "‹ back" })).toHaveCount(0);
      expect(await scrollsVertically(page)).toBe(!phone.fitsHome);
    });

    test("never lets the bar cover the end of a Screen", async ({ app, page }) => {
      await app({ age: 365, habits: ["workout", "read", "meds"] });

      // Every Screen with a bar, whether it overflows on this phone or not. The
      // Screen that actually overflows is pinned separately below, because
      // which one that is now depends on the phone.
      await openHabit(page, "workout");
      expect(await gapBelowContent(page)).toBeGreaterThanOrEqual(0);

      await page.getByRole("button", { name: "‹ back" }).click();
      await page.getByRole("button", { name: "settings" }).click();
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

      await page.getByRole("button", { name: "settings" }).click();
      await page.getByRole("button", { name: "make a share card ›" }).click();
      await expect(page.getByRole("heading", { name: "share card" })).toBeVisible();

      await page.goBack();
      await expect(page.getByRole("heading", { name: "settings" })).toBeVisible();

      await page.getByRole("button", { name: "‹ back" }).click();
      await expect(page.getByRole("button", { name: "settings" })).toBeVisible();
    });
  });
}

/**
 * The gap assertions above are only worth something on a Screen that actually
 * overflows, and since the per-Habit lists left settings the app fits on a
 * Pixel and an iPhone without scrolling at all. The floor is where the overlap
 * can still happen, so that is where it is proved rather than assumed.
 */
test.describe("the Screen that still overflows", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("scrolls, and still keeps its last line clear of the bar", async ({ app, page }) => {
    await app({ age: 365, habits: ["workout", "read", "meds"] });

    await page.getByRole("button", { name: "settings" }).click();
    expect(await scrollsVertically(page)).toBe(true);
    expect(await gapBelowContent(page)).toBeGreaterThanOrEqual(0);
  });
});
