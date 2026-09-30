import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Issue #639 — a single chromium project meant the navigation, the offline
  // banner, and the outages filtering bar were only ever rendered at desktop
  // width, so a handset-width regression could pass every run. `mobile-chromium`
  // replays the core journeys plus the dedicated responsive smoke spec at a
  // handset-class viewport. The responsive spec is excluded from the desktop
  // project so its narrow-viewport assertions are not evaluated off-target.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /responsive-smoke\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /(core-journeys|responsive-smoke)\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
