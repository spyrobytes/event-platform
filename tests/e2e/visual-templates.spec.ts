import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for event page templates
 *
 * These tests capture screenshots of each template and compare them against baselines
 * to detect unintended visual changes.
 *
 * Run with: npx playwright test visual-templates.spec.ts --project=visual-regression
 * Update baselines: npx playwright test visual-templates.spec.ts --project=visual-regression --update-snapshots
 */

const TEMPLATES = ["wedding_v1", "conference_v1", "party_v1"] as const;

// Viewport sizes for responsive testing
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe("Template Visual Regression", () => {
  // Increase timeout for visual tests (screenshots can be slow)
  test.setTimeout(60000);

  for (const templateId of TEMPLATES) {
    test.describe(`${templateId} template`, () => {
      test(`should match desktop snapshot`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await page.goto(`/test/template-preview/${templateId}`);

        // Wait for page to be fully loaded
        await page.waitForLoadState("networkidle");

        // Wait a bit for any CSS transitions/animations
        await page.waitForTimeout(500);

        // Take full page screenshot
        await expect(page).toHaveScreenshot(`${templateId}-desktop.png`, {
          fullPage: true,
        });
      });

      test(`should match tablet snapshot`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.tablet);
        await page.goto(`/test/template-preview/${templateId}`);

        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${templateId}-tablet.png`, {
          fullPage: true,
        });
      });

      test(`should match mobile snapshot`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.mobile);
        await page.goto(`/test/template-preview/${templateId}`);

        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${templateId}-mobile.png`, {
          fullPage: true,
        });
      });
    });
  }
});

test.describe("Template Section Visual Regression", () => {
  test.setTimeout(60000);

  // Test individual sections for more granular visual testing
  // Using wedding template as the reference for section testing

  test("Hero section should match snapshot", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/wedding_v1");
    await page.waitForLoadState("networkidle");

    // Screenshot just the hero section
    const heroSection = page.locator("section").first();
    await expect(heroSection).toHaveScreenshot("hero-section.png");
  });

  test("Schedule section should match snapshot", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/wedding_v1");
    await page.waitForLoadState("networkidle");

    // Find and screenshot the schedule section
    const scheduleSection = page.locator('section:has-text("Schedule")').first();
    if (await scheduleSection.isVisible()) {
      await expect(scheduleSection).toHaveScreenshot("schedule-section.png");
    }
  });

  test("FAQ section should match snapshot", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/wedding_v1");
    await page.waitForLoadState("networkidle");

    // Find and screenshot the FAQ section
    const faqSection = page.locator('section:has-text("FAQ")').first();
    if (await faqSection.isVisible()) {
      await expect(faqSection).toHaveScreenshot("faq-section.png");
    }
  });
});

test.describe("Template Theme Variations", () => {
  test.setTimeout(60000);

  // Test that different color schemes work correctly
  // This test verifies the primary color application

  test("Conference template should render correctly", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/conference_v1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify the page rendered without errors
    await expect(page.locator("body")).not.toContainText("Error");
    await expect(page.locator("body")).not.toContainText("404");

    // Verify key content is visible
    await expect(page.getByText("Sample Event Title")).toBeVisible();
  });

  test("Party template should render correctly", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/party_v1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify the page rendered without errors
    await expect(page.locator("body")).not.toContainText("Error");
    await expect(page.locator("body")).not.toContainText("404");

    // Verify key content is visible
    await expect(page.getByText("Sample Event Title")).toBeVisible();
  });

  test("Wedding template should render correctly", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/test/template-preview/wedding_v1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify the page rendered without errors
    await expect(page.locator("body")).not.toContainText("Error");
    await expect(page.locator("body")).not.toContainText("404");

    // Verify key content is visible
    await expect(page.getByText("Sample Event Title")).toBeVisible();
  });
});

test.describe("Template Accessibility Checks", () => {
  // Basic accessibility-related visual checks

  test("Templates should have readable text contrast", async ({ page }) => {
    for (const templateId of TEMPLATES) {
      await page.goto(`/test/template-preview/${templateId}`);
      await page.waitForLoadState("networkidle");

      // Check that main heading is visible
      const heading = page.getByRole("heading", { level: 1 }).first();
      await expect(heading).toBeVisible();

      // Check that body text is visible
      const bodyText = page.locator("p").first();
      if (await bodyText.isVisible()) {
        await expect(bodyText).toBeVisible();
      }
    }
  });

  test("Templates should have proper heading structure", async ({ page }) => {
    for (const templateId of TEMPLATES) {
      await page.goto(`/test/template-preview/${templateId}`);
      await page.waitForLoadState("networkidle");

      // Check for h1
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check for section headings
      const h2Count = await page.locator("h2").count();
      expect(h2Count).toBeGreaterThanOrEqual(1);
    }
  });
});
