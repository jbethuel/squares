import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against a real browser and a real localStorage.
 *
 * By default this drives the dev server. `E2E_STATIC=1` builds and serves the
 * static export instead — the artefact that actually ships (ADR 0002), which is
 * worth running before a release even though it is slower.
 */
const STATIC = Boolean(process.env.E2E_STATIC);
const PORT = STATIC ? 4173 : 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    // The app is a phone-first PWA: 53 columns of ~5.4px are sized for this.
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } }],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: STATIC ? "npm run build && npm run preview" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
