import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3005);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/global/e2e-global-setup.ts",
  globalTeardown: "./tests/global/e2e-global-teardown.ts",
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI ? "npm run test:serve:ci" : "npm run test:serve:stable",
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 240000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile|@smoke/,
    },
  ],
});
