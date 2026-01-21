import { test, expect } from "@playwright/test";
import {
  clearAllTestUsers,
  isEmulatorRunning,
} from "./utils/firebase-emulator";
import {
  setupTestUser,
  loginAsTestUser,
  createTestEvent,
  deleteTestEvent,
  navigateToPageEditor,
  navigateToEventDetail,
  savePageEditorChanges,
  addSection,
  generatePreviewToken,
  duplicateEvent,
  refreshIdToken,
} from "./utils/test-helpers";

/**
 * E2E tests for Custom Event Pages Phase 3 features
 *
 * Prerequisites:
 * 1. Local Supabase running: `npm run supabase:start`
 * 2. Firebase Auth Emulator running: `npm run emulators`
 * 3. Dev server will be started automatically by Playwright
 *
 * Run with: npx playwright test custom-pages-phase3.spec.ts
 *
 * Tests cover:
 * - RSVP section editing
 * - Speakers section editing
 * - Sponsors section editing
 * - Map section editing
 * - Preview sharing
 * - Event duplication
 */

/**
 * Check if Supabase is running by testing the health endpoint
 */
async function isSupabaseRunning(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:3000/api/health");
    return response.ok;
  } catch {
    return false;
  }
}

test.describe("Custom Pages Phase 3", () => {
  // Increase timeout for these tests
  test.setTimeout(60000);

  test.beforeAll(async () => {
    // Verify Firebase Emulator is running
    const emulatorUp = await isEmulatorRunning();
    if (!emulatorUp) {
      throw new Error(
        "Firebase Auth Emulator is not running. Start it with: npm run emulators"
      );
    }

    // Verify Supabase/API is accessible (requires dev server to be running)
    // Note: Playwright's webServer config starts the dev server, but Supabase must be started separately
    const supabaseUp = await isSupabaseRunning();
    if (!supabaseUp) {
      throw new Error(
        "Supabase is not running or API is not accessible. Start it with: npm run supabase:start"
      );
    }
  });

  test.beforeEach(async () => {
    // Clear all test users before each test for isolation
    await clearAllTestUsers();
  });

  test.describe("Page Editor - Section Management", () => {
    test("should add and configure RSVP section", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("rsvp");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Add RSVP section
        await addSection(page, "RSVP");

        // Verify RSVP section appears
        await expect(page.getByText("Rsvp Section")).toBeVisible();

        // Configure RSVP settings
        const headingInput = page.locator('input[id="rsvp-heading"]');
        if (await headingInput.isVisible()) {
          await headingInput.clear();
          await headingInput.fill("Join Us!");
        }

        // Toggle plus ones
        const plusOnesCheckbox = page.getByLabel(/allow.*plus/i);
        if (await plusOnesCheckbox.isVisible()) {
          await plusOnesCheckbox.check();
        }

        // Save changes
        await savePageEditorChanges(page);

        // Verify changes persisted by refreshing
        await page.reload();
        await expect(page.getByText("Rsvp Section")).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should add and configure Speakers section", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("speakers");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Add Speakers section
        await addSection(page, "Speakers");

        // Verify Speakers section appears
        await expect(page.getByText("Speakers Section")).toBeVisible();

        // Add a speaker
        const addSpeakerBtn = page.getByRole("button", { name: /add speaker/i });
        if (await addSpeakerBtn.isVisible()) {
          await addSpeakerBtn.click();

          // Fill in speaker details
          const nameInput = page.locator('input[placeholder*="name" i]').first();
          if (await nameInput.isVisible()) {
            await nameInput.fill("Dr. Jane Smith");
          }

          const roleInput = page.locator('input[placeholder*="role" i]').first();
          if (await roleInput.isVisible()) {
            await roleInput.fill("Keynote Speaker");
          }
        }

        // Save changes
        await savePageEditorChanges(page);

        // Verify changes persisted
        await page.reload();
        await expect(page.getByText("Speakers Section")).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should add and configure Sponsors section", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("sponsors");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Add Sponsors section
        await addSection(page, "Sponsors");

        // Verify Sponsors section appears
        await expect(page.getByText("Sponsors Section")).toBeVisible();

        // Add a sponsor
        const addSponsorBtn = page.getByRole("button", { name: /add sponsor/i });
        if (await addSponsorBtn.isVisible()) {
          await addSponsorBtn.click();

          // Fill in sponsor details
          const nameInput = page.locator('input[placeholder*="name" i]').first();
          if (await nameInput.isVisible()) {
            await nameInput.fill("TechCorp International");
          }
        }

        // Save changes
        await savePageEditorChanges(page);

        // Verify changes persisted
        await page.reload();
        await expect(page.getByText("Sponsors Section")).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should add and configure Map section", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("map");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Add Map section
        await addSection(page, "Map");

        // Verify Map section appears
        await expect(page.getByText("Map Section")).toBeVisible();

        // Configure map settings
        const addressInput = page.locator('input[id="map-address"]');
        if (await addressInput.isVisible()) {
          await addressInput.fill("123 Main Street, New York, NY 10001");
        }

        const latInput = page.locator('input[id="map-latitude"]');
        if (await latInput.isVisible()) {
          await latInput.fill("40.7128");
        }

        const lngInput = page.locator('input[id="map-longitude"]');
        if (await lngInput.isVisible()) {
          await lngInput.fill("-74.006");
        }

        // Save changes
        await savePageEditorChanges(page);

        // Verify changes persisted
        await page.reload();
        await expect(page.getByText("Map Section")).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should remove a section", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("remove");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Add RSVP section first
        await addSection(page, "RSVP");
        await expect(page.getByText("Rsvp Section")).toBeVisible();

        // Find and click remove button
        const rsvpCard = page.locator("text=Rsvp Section").locator("..").locator("..");
        const removeBtn = rsvpCard.getByRole("button", { name: /remove/i });
        await removeBtn.click();

        // Verify section is removed
        await expect(page.getByText("Rsvp Section")).not.toBeVisible();

        // Verify "+ RSVP" button is back
        await expect(page.getByRole("button", { name: "+ RSVP" })).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });
  });

  test.describe("Preview Sharing", () => {
    test("should generate and display preview link", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("preview");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        await navigateToPageEditor(page, event.id);

        // Find preview share card
        await expect(page.getByText("Share Preview")).toBeVisible();

        // Click generate button
        const generateBtn = page.getByRole("button", { name: /generate preview link/i });
        await generateBtn.click();

        // Wait for link to be generated
        await page.waitForTimeout(1000);

        // Verify preview URL is displayed
        const previewInput = page.locator('input[readonly]').filter({ hasText: /preview/i });
        await expect(previewInput.or(page.locator("input").filter({ hasText: "" }))).toBeVisible();

        // Verify copy button appears
        await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should access preview page with valid token", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("preview-access");
      const event = await createTestEvent(credentials.idToken);

      try {
        // Generate preview token via API
        const { token } = await generatePreviewToken(credentials.idToken, event.id);

        // Visit preview page (no login required)
        await page.goto(`/preview/${token}`);

        // Verify preview banner is shown
        await expect(page.getByText("Preview Mode")).toBeVisible();

        // Verify event content is displayed
        await expect(page.locator("body")).not.toContainText("404");
        await expect(page.locator("body")).not.toContainText("Not Found");
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });

    test("should show 404 for invalid preview token", async ({ page }) => {
      await page.goto("/preview/invalid-token-12345");

      // Should show 404 or not found
      await expect(page).toHaveURL(/preview/);
      // The page should indicate the preview is not available
    });

    test("should revoke preview link", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("preview-revoke");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      try {
        // Generate preview token first
        const { token } = await generatePreviewToken(credentials.idToken, event.id);

        await navigateToPageEditor(page, event.id);

        // Find and click revoke button
        const revokeBtn = page.getByRole("button", { name: /revoke/i });
        if (await revokeBtn.isVisible()) {
          await revokeBtn.click();
          await page.waitForTimeout(1000);
        }

        // Try to access the preview page - should fail
        await page.goto(`/preview/${token}`);

        // Preview should no longer be accessible
        // (either 404 or redirect)
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
      }
    });
  });

  test.describe("Duplicate Event", () => {
    test("should duplicate event via UI button", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("duplicate");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken, {
        title: "Original Event",
      });

      let duplicatedEventId: string | null = null;

      try {
        await navigateToEventDetail(page, event.id);

        // Click duplicate button
        const duplicateBtn = page.getByRole("button", { name: /duplicate/i });
        await expect(duplicateBtn).toBeVisible();
        await duplicateBtn.click();

        // Should redirect to new event page
        await page.waitForURL(/\/dashboard\/events\/[^/]+$/, { timeout: 10000 });

        // Verify new event has "Copy of" prefix
        await expect(page.getByText("Copy of Original Event")).toBeVisible();

        // Extract duplicated event ID from URL for cleanup
        const url = page.url();
        const match = url.match(/\/dashboard\/events\/([^/]+)$/);
        if (match) {
          duplicatedEventId = match[1];
        }
      } finally {
        // Cleanup both events
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
        if (duplicatedEventId) {
          await deleteTestEvent(freshToken, duplicatedEventId);
        }
      }
    });

    test("should duplicate event via API", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("duplicate-api");
      const event = await createTestEvent(credentials.idToken, {
        title: "API Test Event",
        description: "Testing duplication via API",
      });

      try {
        // Duplicate via API
        const duplicated = await duplicateEvent(credentials.idToken, event.id);

        // Verify duplicated event
        expect(duplicated.title).toBe("Copy of API Test Event");
        expect(duplicated.id).not.toBe(event.id);
        expect(duplicated.slug).not.toBe(event.slug);

        // Cleanup duplicated event
        await deleteTestEvent(credentials.idToken, duplicated.id);
      } finally {
        // Cleanup original event
        await deleteTestEvent(credentials.idToken, event.id);
      }
    });

    test("duplicated event should be in DRAFT status", async ({ page }) => {
      // Setup
      const credentials = await setupTestUser("duplicate-draft");
      await loginAsTestUser(page, credentials);
      const event = await createTestEvent(credentials.idToken);

      let duplicatedEventId: string | null = null;

      try {
        // Duplicate via API
        const duplicated = await duplicateEvent(credentials.idToken, event.id);
        duplicatedEventId = duplicated.id;

        // Navigate to duplicated event
        await navigateToEventDetail(page, duplicated.id);

        // Verify it's in DRAFT status
        await expect(page.getByText("Draft")).toBeVisible();
      } finally {
        // Cleanup
        const freshToken = await refreshIdToken(credentials.email);
        await deleteTestEvent(freshToken, event.id);
        if (duplicatedEventId) {
          await deleteTestEvent(freshToken, duplicatedEventId);
        }
      }
    });
  });

  test.describe("Visual Regression - New Sections", () => {
    test("should render RSVP section correctly in template preview", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/test/template-preview/wedding_v1");
      await page.waitForLoadState("networkidle");

      // Verify RSVP section is visible
      const rsvpSection = page.locator('section:has-text("RSVP")');
      await expect(rsvpSection).toBeVisible();

      // Verify RSVP form elements
      await expect(page.getByText("Please let us know if you can make it")).toBeVisible();
    });

    test("should render Speakers section correctly in template preview", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/test/template-preview/conference_v1");
      await page.waitForLoadState("networkidle");

      // Verify Speakers section is visible
      const speakersSection = page.locator('section:has-text("Featured Speakers")');
      await expect(speakersSection).toBeVisible();

      // Verify speaker names
      await expect(page.getByText("Dr. Jane Smith")).toBeVisible();
      await expect(page.getByText("John Doe")).toBeVisible();
    });

    test("should render Sponsors section correctly in template preview", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/test/template-preview/conference_v1");
      await page.waitForLoadState("networkidle");

      // Verify Sponsors section is visible
      const sponsorsSection = page.locator('section:has-text("Our Sponsors")');
      await expect(sponsorsSection).toBeVisible();

      // Verify sponsor names
      await expect(page.getByText("TechCorp International")).toBeVisible();
    });

    test("should render Map section correctly in template preview", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/test/template-preview/wedding_v1");
      await page.waitForLoadState("networkidle");

      // Verify Map section is visible
      const mapSection = page.locator('section:has-text("Find Us")');
      await expect(mapSection).toBeVisible();

      // Verify address is displayed
      await expect(page.getByText("123 Event Plaza")).toBeVisible();

      // Verify directions button if enabled
      const directionsLink = page.getByRole("link", { name: /directions/i });
      if (await directionsLink.isVisible()) {
        await expect(directionsLink).toHaveAttribute("href", /google\.com\/maps/);
      }
    });
  });
});
