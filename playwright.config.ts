import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against a real browser and a real localStorage.
 *
 * By default this drives a dev server of its own. `E2E_STATIC=1` builds and
 * serves the static export instead — the artefact that actually ships (ADR
 * 0002), which is worth running before a release even though it is slower.
 *
 * The suite runs on port 3100, not the 3000 `pnpm dev` uses, and never adopts a
 * server it did not start. It used to do both, and the failure mode was vile: a
 * `next dev` left behind by an earlier run — on another branch, or wedged and
 * answering 500 — would be reused, and every single test would fail at page
 * load with nothing to say why. A dedicated port means `pnpm dev` and
 * `pnpm test:e2e` can run side by side, and refusing to reuse means a stale
 * server is a loud "port in use" rather than sixty silent failures.
 *
 * To point the suite at a server you are running yourself, set
 * `PLAYWRIGHT_BASE_URL` — that is the deliberate way in, and it skips the
 * managed server entirely.
 */
const STATIC = Boolean(process.env.E2E_STATIC);
const PORT = STATIC ? 4173 : 3100;
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
        command: STATIC ? "pnpm build && pnpm preview" : `pnpm exec next dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
