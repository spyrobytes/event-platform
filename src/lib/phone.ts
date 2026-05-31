/**
 * Shared phone-number helpers. Kept provider-agnostic and dependency-free so
 * both the invite share UI and the attire-contact resolver normalize numbers
 * the same way (avoids divergent regexes drifting apart).
 */

/** E.164: "+" followed by 1–15 digits, first digit non-zero. */
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/** Keep only dialable characters: digits and a leading "+". */
export function stripNonDialChars(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

/**
 * Digits-only form for `wa.me` links (country code + number, no "+").
 * Returns "" when no digits remain.
 */
export function toWhatsAppNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/** True when `value` is a well-formed E.164 number. */
export function isE164(value: string): boolean {
  return E164_REGEX.test(value);
}
