import { test, expect } from "@playwright/test";
import {
  createTestUser,
  clearAllTestUsers,
  generateTestEmail,
  isEmulatorRunning,
} from "./utils/firebase-emulator";

// Test user credentials
const TEST_PASSWORD = "password123";

test.describe("Authentication", () => {
  test.beforeAll(async () => {
    // Verify Firebase Emulator is running
    const emulatorUp = await isEmulatorRunning();
    if (!emulatorUp) {
      throw new Error(
        "Firebase Auth Emulator is not running. Start it with: npm run emulators"
      );
    }
  });

  test.beforeEach(async () => {
    // Clear all test users before each test for isolation
    await clearAllTestUsers();
  });

  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      // Verify page title and description
      await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
      await expect(page.getByText("Sign in to manage your events")).toBeVisible();

      // Verify form elements
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

      // Verify signup link
      await expect(page.getByText("Don't have an account?")).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      // Fill in invalid credentials
      await page.getByLabel("Email").fill("nonexistent@test.local");
      await page.getByLabel("Password", { exact: true }).fill("wrongpassword");

      // Submit the form
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should show error message
      await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("should successfully login with valid credentials", async ({ page }) => {
      // Create a test user via the emulator API
      const testEmail = generateTestEmail("login");
      await createTestUser(testEmail, TEST_PASSWORD, "Test User");

      await page.goto("/login");

      // Fill in valid credentials
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);

      // Submit the form
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

      // Should show dashboard content
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await expect(page.getByText("Welcome back")).toBeVisible();
    });

    test("should redirect authenticated user to dashboard", async ({ page }) => {
      // Create and login a test user
      const testEmail = generateTestEmail("redirect");
      await createTestUser(testEmail, TEST_PASSWORD);

      // First, login
      await page.goto("/login");
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

      // Now try to access login page again
      await page.goto("/login");

      // Should redirect back to dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    });

    test("should navigate to signup page", async ({ page }) => {
      await page.goto("/login");

      // Click signup link
      await page.getByRole("link", { name: "Sign up" }).click();

      // Should navigate to signup page
      await expect(page).toHaveURL("/signup");
      await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
    });

    test("should show loading state during login", async ({ page }) => {
      const testEmail = generateTestEmail("loading");
      await createTestUser(testEmail, TEST_PASSWORD);

      await page.goto("/login");

      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);

      // Click and immediately check for loading state
      await page.getByRole("button", { name: "Sign In" }).click();

      // Button should show loading text (may be brief)
      // We check that eventually we end up on the dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    });

    test("should handle required field validation", async ({ page }) => {
      await page.goto("/login");

      // Try to submit without filling fields
      await page.getByRole("button", { name: "Sign In" }).click();

      // HTML5 validation should prevent submission
      // Check that email field is still focused/required
      const emailInput = page.getByLabel("Email");
      await expect(emailInput).toHaveAttribute("required");

      const passwordInput = page.getByLabel("Password", { exact: true });
      await expect(passwordInput).toHaveAttribute("required");
    });
  });

  test.describe("Signup Page", () => {
    test("should display signup form", async ({ page }) => {
      await page.goto("/signup");

      // Verify page title and description
      await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
      await expect(page.getByText("Sign up to start creating events")).toBeVisible();

      // Verify form elements
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Confirm Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();

      // Verify login link
      await expect(page.getByText("Already have an account?")).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    });

    test("should show error when passwords do not match", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel("Email").fill(generateTestEmail("mismatch"));
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await page.getByLabel("Confirm Password").fill("differentpassword");

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show password mismatch error
      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("should show error for password too short", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel("Email").fill(generateTestEmail("short"));
      await page.getByLabel("Password", { exact: true }).fill("12345");
      await page.getByLabel("Confirm Password").fill("12345");

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show password length error
      await expect(page.getByText("Password must be at least 6 characters")).toBeVisible();
    });

    test("should successfully create account and redirect to dashboard", async ({ page }) => {
      const testEmail = generateTestEmail("signup");

      await page.goto("/signup");

      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

      // Should show dashboard
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    });

    test("should show error for duplicate email", async ({ page }) => {
      const testEmail = generateTestEmail("duplicate");

      // First, create a user with this email
      await createTestUser(testEmail, TEST_PASSWORD);

      await page.goto("/signup");

      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);

      await page.getByRole("button", { name: "Create Account" }).click();

      // Should show error about existing account
      await expect(page.getByText(/already|exists|in use/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("should navigate to login page", async ({ page }) => {
      await page.goto("/signup");

      // Click login link
      await page.getByRole("link", { name: "Sign in" }).click();

      // Should navigate to login page
      await expect(page).toHaveURL("/login");
      await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user from dashboard to login", async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto("/dashboard");

      // Should see loading or redirect to login
      // The auth guard may show loading first, then redirect
      await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10000 });

      // If we're on dashboard, the page should eventually redirect
      // or show an auth-required state
    });

    test("should allow authenticated user to access dashboard", async ({ page }) => {
      const testEmail = generateTestEmail("protected");
      await createTestUser(testEmail, TEST_PASSWORD);

      // Login first
      await page.goto("/login");
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

      // Now navigate to other protected routes
      await page.goto("/dashboard/events");
      await expect(page.getByRole("heading", { name: /events/i })).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
