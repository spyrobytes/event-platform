import { getAuth } from "firebase-admin/auth";
import { db } from "./db";
import { getFirebaseAdmin } from "./auth";
import { generateTokenPair, hashToken } from "./tokens";
import { queuePasswordResetEmail, processEmail } from "./email";
import { ValidationError } from "./errors";

const RESET_EXPIRY_HOURS = 1;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send a password reset email for the given email address.
 * Silently succeeds even if the email doesn't exist (prevents enumeration).
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  // Generate token pair
  const { token, hash } = generateTokenPair();
  const expiresAt = new Date(
    Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Store hash + expiry (invalidates any previous reset token)
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  // Queue and send email
  const resetUrl = `${APP_URL}/reset-password/${token}`;
  const emailId = await queuePasswordResetEmail(user.email, {
    resetUrl,
    expiresInHours: RESET_EXPIRY_HOURS,
  });

  // Process immediately (don't wait for cron)
  processEmail(emailId).catch((err) => {
    console.error(`Failed to send password reset email ${emailId}:`, err);
  });
}

/**
 * Reset the user's password using a valid reset token.
 * Updates the password in Firebase Auth and clears the token.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = hashToken(token);

  const user = await db.user.findFirst({
    where: { passwordResetTokenHash: tokenHash },
    select: {
      id: true,
      firebaseUid: true,
      passwordResetExpiresAt: true,
    },
  });

  if (!user) {
    throw new ValidationError("Invalid or expired reset link");
  }

  if (user.passwordResetExpiresAt && new Date() > user.passwordResetExpiresAt) {
    throw new ValidationError(
      "Reset link has expired. Please request a new one."
    );
  }

  // Update password in Firebase Auth
  getFirebaseAdmin();
  await getAuth().updateUser(user.firebaseUid, { password: newPassword });

  // Clear reset token
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
}
