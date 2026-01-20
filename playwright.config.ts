import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // Snapshot configuration for visual regression tests
  snapshotDir: "./tests/e2e/__snapshots__",
  snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      // Allow 0.5% pixel difference for anti-aliasing variations
      maxDiffPixelRatio: 0.005,
      // Animation timeout - wait for animations to complete
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Visual regression tests run only on Chromium for consistency
    {
      name: "visual-regression",
      testMatch: /visual.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    // Use dev:local for E2E tests (connects to Firebase Emulator + Mailpit)
    command: "npm run dev:local",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
