import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * Generates a cryptographically secure random token.
 * Returns a 32-byte token encoded as base64url (URL-safe).
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a token using SHA-256.
 * This is used to store tokens securely in the database.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies a token against a hash using timing-safe comparison.
 * Returns true if the token matches the hash.
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);

  // Convert to buffers for timing-safe comparison
  const tokenHashBuffer = Buffer.from(tokenHash, "hex");
  const hashBuffer = Buffer.from(hash, "hex");

  // Ensure both buffers are the same length
  if (tokenHashBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenHashBuffer, hashBuffer);
}

/**
 * Generates a token and returns both the raw token and its hash.
 * The raw token is sent to the user, the hash is stored in the database.
 */
export function generateTokenPair(): { token: string; hash: string } {
  const token = generateToken();
  const hash = hashToken(token);
  return { token, hash };
}
