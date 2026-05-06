import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { NextRequest } from "next/server";
import { db } from "./db";
import type { User } from "@prisma/client";

// Initialize Firebase Admin SDK
let firebaseApp: App;

// Check if running with emulator
const isEmulatorMode = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

export function getFirebaseAdmin(): App {
  if (firebaseApp) return firebaseApp;

  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  // In emulator mode with demo project, credentials are not required
  if (isEmulatorMode) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID || "demo-event-platform";
    firebaseApp = initializeApp({ projectId });
    return firebaseApp;
  }

  // Production: require full credentials
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  firebaseApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return firebaseApp;
}

/**
 * Verifies the Firebase ID token from the Authorization header
 * and returns the user from the database (creating if necessary)
 */
export async function verifyAuth(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    getFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(token);

    // Get or create user in our database
    // First try to find by firebaseUid
    let user = await db.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (user) {
      // Once the user exists in the DB, only `email` syncs from the token —
      // it's Firebase-authoritative since it's the auth identifier. `name`
      // and `avatarUrl` become DB-authoritative after creation; the profile
      // page (PATCH /api/users/me) is the writer, and it pushes updates
      // back to Firebase via Admin SDK. Otherwise a stale cached token
      // could clobber a freshly-edited name on the next authed request.
      const newEmail = decoded.email ?? "";
      if (user.email !== newEmail) {
        user = await db.user.update({
          where: { id: user.id },
          data: { email: newEmail },
        });
      }
    } else {
      // Not found by firebaseUid - check if email exists (e.g., emulator restart)
      const existingByEmail = decoded.email
        ? await db.user.findUnique({ where: { email: decoded.email } })
        : null;

      if (existingByEmail) {
        // Emulator-restart path: same email, new firebaseUid. Rewrite the
        // UID only — see existing-user branch above for why name/avatarUrl
        // stay DB-authoritative.
        user = await db.user.update({
          where: { id: existingByEmail.id },
          data: { firebaseUid: decoded.uid },
        });
      } else {
        // Create new user
        user = await db.user.create({
          data: {
            firebaseUid: decoded.uid,
            email: decoded.email ?? "",
            name: decoded.name ?? null,
            avatarUrl: decoded.picture ?? null,
          },
        });
      }
    }

    // Layer 1: BANNED users are treated as unauthenticated
    if (user.status === "BANNED") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Auth verification failed:", error);
    return null;
  }
}

/**
 * Gets the current user from a request, throwing if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await verifyAuth(request);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Updates the Firebase Auth user's displayName. Centralizes init+call so
 * route handlers don't import firebase-admin/auth directly.
 */
export async function setFirebaseDisplayName(
  firebaseUid: string,
  displayName: string
): Promise<void> {
  getFirebaseAdmin();
  await getAuth().updateUser(firebaseUid, { displayName });
}
