/**
 * E2E test helpers for event platform
 *
 * These utilities help create test data and perform common actions
 * in E2E tests.
 */

import { Page } from "@playwright/test";
import { createTestUser, signInTestUser, generateTestEmail } from "./firebase-emulator";

const TEST_PASSWORD = "password123";

type TestUserCredentials = {
  email: string;
  password: string;
  idToken: string;
  localId: string;
};

/**
 * Create a test user and return credentials
 */
export async function setupTestUser(prefix = "e2e"): Promise<TestUserCredentials> {
  const email = generateTestEmail(prefix);
  const result = await createTestUser(email, TEST_PASSWORD, "Test User");
  return {
    email,
    password: TEST_PASSWORD,
    idToken: result.idToken,
    localId: result.localId,
  };
}

/**
 * Login as a test user via the UI
 */
export async function loginAsTestUser(page: Page, credentials: TestUserCredentials): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/dashboard", { timeout: 10000 });
}

/**
 * Create a test event via API
 */
export async function createTestEvent(
  idToken: string,
  overrides: Partial<{
    title: string;
    description: string;
    startAt: string;
    timezone: string;
    venueName: string;
    city: string;
    templateId: string;
  }> = {}
): Promise<{ id: string; slug: string; title: string }> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventData = {
    title: `Test Event ${Date.now()}`,
    description: "A test event for E2E testing",
    startAt: tomorrow.toISOString(),
    timezone: "America/New_York",
    venueName: "Test Venue",
    city: "Test City",
    templateId: "wedding_v1",
    ...overrides,
  };

  const response = await fetch("http://localhost:3000/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test event: ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a test event via API
 */
export async function deleteTestEvent(idToken: string, eventId: string): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete test event: ${error}`);
  }
}

/**
 * Get a fresh ID token for a test user
 */
export async function refreshIdToken(email: string): Promise<string> {
  const result = await signInTestUser(email, TEST_PASSWORD);
  return result.idToken;
}

/**
 * Navigate to the page editor for an event
 */
export async function navigateToPageEditor(page: Page, eventId: string): Promise<void> {
  await page.goto(`/dashboard/events/${eventId}/page-editor`);
  await page.waitForSelector("text=Page Editor", { timeout: 10000 });
}

/**
 * Navigate to the event detail page
 */
export async function navigateToEventDetail(page: Page, eventId: string): Promise<void> {
  await page.goto(`/dashboard/events/${eventId}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Save page editor changes
 */
export async function savePageEditorChanges(page: Page): Promise<void> {
  const saveButton = page.getByRole("button", { name: "Save Changes" });
  await saveButton.click();
  // Wait for save to complete (button should become disabled or show success)
  await page.waitForTimeout(1000);
}

/**
 * Add a section in the page editor
 */
export async function addSection(page: Page, sectionType: string): Promise<void> {
  const addButton = page.getByRole("button", { name: `+ ${sectionType}` });
  if (await addButton.isVisible()) {
    await addButton.click();
  }
}

/**
 * Generate a preview token for an event via API
 */
export async function generatePreviewToken(
  idToken: string,
  eventId: string
): Promise<{ token: string; expiresAt: string }> {
  const response = await fetch(`http://localhost:3000/api/events/${eventId}/preview-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate preview token: ${error}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Duplicate an event via API
 */
export async function duplicateEvent(
  idToken: string,
  eventId: string
): Promise<{ id: string; slug: string; title: string }> {
  const response = await fetch(`http://localhost:3000/api/events/${eventId}/duplicate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to duplicate event: ${error}`);
  }

  const result = await response.json();
  return result.data;
}
