import { getAuth } from "firebase-admin/auth";
import { db } from "./db";
import { getFirebaseAdmin } from "./auth";
import { generateTokenPair, hashToken } from "./tokens";
import { queueVerificationEmail, processEmail } from "./email";
import { ValidationError, NotFoundError } from "./errors";

const VERIFICATION_EXPIRY_HOURS = 24;
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

/**
 * Create and send a verification email for a user
 */
export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified");
  }

  // Generate token pair
  const { token, hash } = generateTokenPair();
  const expiresAt = new Date(
    Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Update user with new token (invalidates any previous token)
  await db.user.update({
    where: { id: userId },
    data: {
      verificationTokenHash: hash,
      verificationExpiresAt: expiresAt,
    },
  });

  // Queue and send email
  const verificationUrl = `${APP_URL}/verify-email/${token}`;
  const emailId = await queueVerificationEmail(user.email, {
    verificationUrl,
    expiresInHours: VERIFICATION_EXPIRY_HOURS,
  });

  // Process immediately (don't wait for cron)
  processEmail(emailId).catch((err) => {
    console.error(`Failed to send verification email ${emailId}:`, err);
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  token: string
): Promise<{ success: boolean; email: string }> {
  // Hash the incoming token and look up directly by hash (O(1) instead of table scan)
  const tokenHash = hashToken(token);

  const user = await db.user.findFirst({
    where: { verificationTokenHash: tokenHash },
    select: {
      id: true,
      email: true,
      firebaseUid: true,
      emailVerified: true,
      verificationExpiresAt: true,
    },
  });

  if (!user) {
    throw new ValidationError("Invalid or expired verification link");
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified");
  }

  if (user.verificationExpiresAt && new Date() > user.verificationExpiresAt) {
    throw new ValidationError(
      "Verification link has expired. Please request a new one."
    );
  }

  // Sync the Firebase-side emailVerified flag first so the ID token's
  // email_verified claim and client-side auth.currentUser stay consistent
  // with our Postgres User row. If this throws (Firebase outage, missing
  // user), leave the token intact so the user can retry.
  getFirebaseAdmin();
  await getAuth().updateUser(user.firebaseUid, { emailVerified: true });

  // Mark email as verified and clear token
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationExpiresAt: null,
    },
  });

  return { success: true, email: user.email };
}

/**
 * Check if a user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return user?.emailVerified ?? false;
}
