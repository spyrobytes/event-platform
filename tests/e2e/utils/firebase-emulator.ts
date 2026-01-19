/**
 * Firebase Auth Emulator utilities for E2E tests
 *
 * These utilities interact with the Firebase Auth Emulator REST API
 * to create, delete, and manage test users programmatically.
 *
 * Emulator must be running at http://127.0.0.1:9099
 */

const EMULATOR_HOST = "http://127.0.0.1:9099";
const PROJECT_ID = "demo-event-platform";

type EmulatorUser = {
  localId: string;
  email: string;
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
};

type CreateUserResponse = {
  localId: string;
  email: string;
  idToken: string;
  refreshToken: string;
};

/**
 * Create a user in the Firebase Auth Emulator
 */
export async function createTestUser(
  email: string,
  password: string,
  displayName?: string
): Promise<CreateUserResponse> {
  const response = await fetch(
    `${EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test user: ${error}`);
  }

  return response.json();
}

/**
 * Sign in a user via the Firebase Auth Emulator
 */
export async function signInTestUser(
  email: string,
  password: string
): Promise<CreateUserResponse> {
  const response = await fetch(
    `${EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to sign in test user: ${error}`);
  }

  return response.json();
}

/**
 * Delete a user from the Firebase Auth Emulator by local ID
 */
export async function deleteTestUser(localId: string): Promise<void> {
  const response = await fetch(
    `${EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localId }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete test user: ${error}`);
  }
}

/**
 * List all users in the Firebase Auth Emulator
 */
export async function listTestUsers(): Promise<EmulatorUser[]> {
  const response = await fetch(
    `${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list test users: ${error}`);
  }

  const data = await response.json();
  return data.userInfo || [];
}

/**
 * Clear all users from the Firebase Auth Emulator
 */
export async function clearAllTestUsers(): Promise<void> {
  const response = await fetch(
    `${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to clear test users: ${error}`);
  }
}

/**
 * Check if the Firebase Auth Emulator is running
 */
export async function isEmulatorRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${EMULATOR_HOST}/`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@test.local`;
}
