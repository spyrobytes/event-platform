import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/env";

/**
 * HMAC-signed unsubscribe link for gallery broadcast emails.
 *
 * The post-event-gallery broadcast (GALLERY_PUBLISHED) can't reuse the
 * regular `/unsubscribe/[token]` flow: invite tokens are stored hashed
 * (`Invite.tokenHash`) and the raw value isn't recoverable. Re-issuing a
 * fresh token would invalidate the live invite link. So instead we sign
 * the stable invite row IDs at enqueue time and verify on click.
 *
 * Signature contract: HMAC-SHA-256 of `${inviteId}.${eventId}`, peppered
 * with `RSVP_CODE_HMAC_KEY` (already a long-lived secret used for the
 * RSVP-code pepper). Binding both IDs into the payload forces the route
 * handler to do a `findFirst({ id, eventId })` lookup — defense in depth
 * against future ID reuse.
 *
 * Hex digest, lowercase, 64 chars.
 */
export function signInviteUnsubscribe(
  inviteId: string,
  eventId: string,
): string {
  const pepper = env.RSVP_CODE_HMAC_KEY;
  if (!pepper) {
    throw new Error(
      "RSVP_CODE_HMAC_KEY is not configured — cannot sign unsubscribe links.",
    );
  }
  return createHmac("sha256", pepper)
    .update(`${inviteId}.${eventId}`)
    .digest("hex");
}

/**
 * Constant-time signature check. Returns false on any mismatch — including
 * length mismatch (which would otherwise throw inside `timingSafeEqual`)
 * and non-string inputs reaching us from query parsing.
 */
export function verifyInviteUnsubscribe(
  inviteId: string,
  eventId: string,
  signature: string,
): boolean {
  const expected = signInviteUnsubscribe(inviteId, eventId);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}

/**
 * Build the full unsubscribe URL for a gallery broadcast email.
 * `baseUrl` is the deployment root with no trailing slash (the gallery
 * email pipeline already normalizes via the same helper used for
 * `galleryUrl`).
 */
export function buildInviteUnsubscribeUrl(
  baseUrl: string,
  inviteId: string,
  eventId: string,
): string {
  const sig = signInviteUnsubscribe(inviteId, eventId);
  const qs = new URLSearchParams({ inviteId, eventId, sig });
  return `${baseUrl}/unsubscribe/by-id?${qs.toString()}`;
}
