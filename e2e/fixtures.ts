import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { addDays, todayKey, type DateKey } from "../src/domain/date";
import { sealDays } from "../src/domain/mutations";
import { STORAGE_KEY } from "../src/domain/storage";
import { emptyData, type AppData } from "../src/domain/types";

/**
 * The browser and this process share a clock and a timezone, so "today" is
 * resolved here and the account is built around it with the app's own rules
 * rather than a second, drifting copy of them.
 */
export const today = (): DateKey => todayKey();
export const dayBefore = (offset: number): DateKey => addDays(today(), -offset);

interface AccountSpec {
  /** Days on file, day one counting as 1. */
  age?: number;
  habits?: string[];
  /** Habit name -> the Day offsets it was Ticked on. 0 is today. */
  ticks?: Record<string, number[]>;
  chained?: string[];
  sharedNames?: string[];
  theme?: AppData["theme"];
}

export function buildAccount({
  age = 30,
  habits = [],
  ticks = {},
  chained = [],
  sharedNames = [],
  theme = "system",
}: AccountSpec): AppData {
  const now = today();
  const installedOn = addDays(now, -(age - 1));

  let data = sealDays(
    {
      ...emptyData(installedOn),
      theme,
      habits: habits.map((name, index) => ({
        id: `h${index + 1}`,
        name,
        createdOn: installedOn,
        archivedOn: null,
        chained: chained.includes(name),
        sharedName: sharedNames.includes(name),
      })),
    },
    now,
  );

  for (const [name, offsets] of Object.entries(ticks)) {
    const id = data.habits.find((h) => h.name === name)!.id;
    const days = { ...data.days };
    for (const offset of offsets) {
      const date = addDays(now, -offset);
      const record = days[date];
      if (!record) throw new Error(`no record for ${date} — is the account old enough?`);
      days[date] = { ...record, ticked: [...record.ticked, id] };
    }
    data = { ...data, days };
  }

  return data;
}

/**
 * Put a year on the device before the app's first script runs.
 *
 * Init scripts run on every navigation, so this seeds once and then gets out of
 * the way — otherwise a reload would silently restore the year a test had just
 * changed, and every persistence test would pass for the wrong reason.
 */
export async function seedDevice(page: Page, data: AppData): Promise<void> {
  await page.addInitScript(
    ([key, blob, marker]) => {
      if (window.sessionStorage.getItem(marker as string)) return;
      window.sessionStorage.setItem(marker as string, "1");
      window.localStorage.setItem(key as string, blob as string);
    },
    [STORAGE_KEY, JSON.stringify(data), "squares.e2e.seeded"] as const,
  );
}

export async function readDevice(page: Page): Promise<AppData> {
  const blob = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  if (!blob) throw new Error("nothing on the device");
  return JSON.parse(blob) as AppData;
}

/** The app, on a device carrying `spec`. */
export const test = base.extend<{ app: (spec?: AccountSpec) => Promise<Page> }>({
  app: async ({ page }, use) => {
    await use(async (spec: AccountSpec = {}) => {
      if (spec.habits || spec.age) await seedDevice(page, buildAccount(spec));
      await page.goto("/");
      await expect(page.locator(".total")).toBeVisible();
      return page;
    });
  },
});

export { expect };

/** The tick target for a Habit: the row itself. */
export function habitRow(page: Page, name: string): Locator {
  return page.getByRole("button", { name: new RegExp(`^${name},`) });
}

export const total = (page: Page): Locator => page.locator(".total");

const SECTIONS = {
  chains: "chains · per habit",
  names: "share card · names off by default",
} as const;

/**
 * The opt-in switches of one settings section. Anchored to the section's own
 * label, because both groups list the same Habit names and `.stack` is used
 * again inside every row.
 */
export function optIns(page: Page, section: keyof typeof SECTIONS): Locator {
  return page
    .getByText(SECTIONS[section], { exact: true })
    .locator("xpath=following-sibling::div[1]")
    .getByRole("switch");
}
