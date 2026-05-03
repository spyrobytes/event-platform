import { createHmac, randomInt } from "crypto";
import { env } from "@/env";

// Crockford-style alphabet excluding I, O, 0, 1, L to avoid transcription errors.
// 31 chars × 12 random positions ≈ 60 bits of entropy, ample for a code shared
// per-invite and rate-limited at verification.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function chunk(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return out;
}

/**
 * Generate a fresh public-portal RSVP code in `EVG-XXXX-XXXX-XXXX` form.
 * The raw value must be persisted only via {@link hashRsvpCode}; the raw is
 * sent to the guest in the invite email and never stored server-side.
 */
export function generateGuestRsvpCode(): string {
  return `EVG-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

/**
 * Normalize a guest-entered code: strip whitespace and non-alphanumerics,
 * uppercase. Always run this before comparing or hashing user input.
 */
export function normalizeRsvpCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * HMAC-SHA-256 the normalized code with the server-side pepper. The pepper
 * lives only in env, so a full DB leak does not expose codes.
 *
 * Throws at call time if `RSVP_CODE_HMAC_KEY` is unset — keeps PR 1 mergeable
 * without the env var (no callers yet) while still failing loudly the moment
 * a real caller lands without the secret configured.
 */
export function hashRsvpCode(rawCode: string): string {
  const pepper = env.RSVP_CODE_HMAC_KEY;
  if (!pepper) {
    throw new Error(
      "RSVP_CODE_HMAC_KEY is not configured — cannot hash RSVP codes."
    );
  }
  return createHmac("sha256", pepper)
    .update(normalizeRsvpCode(rawCode))
    .digest("hex");
}
