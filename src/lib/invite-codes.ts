import crypto from "crypto";

const CODE_PREFIX = "EVF";
const SEGMENT_LENGTH = 4;
const SEGMENTS = 2;

/**
 * Generate a unique invite code like EVF-A3K9-X7M2.
 * Uses crypto.randomBytes for unpredictability.
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(SEGMENT_LENGTH * SEGMENTS);
  const segments: string[] = [];

  for (let s = 0; s < SEGMENTS; s++) {
    let segment = "";
    for (let i = 0; i < SEGMENT_LENGTH; i++) {
      segment += chars[bytes[s * SEGMENT_LENGTH + i] % chars.length];
    }
    segments.push(segment);
  }

  return `${CODE_PREFIX}-${segments.join("-")}`;
}

/**
 * Normalize an invite code for comparison: uppercase, trim, ensure prefix.
 */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
