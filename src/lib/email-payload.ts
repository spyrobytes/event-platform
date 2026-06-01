/**
 * Helpers for reading values back out of a stored `email_outbox.payload`.
 *
 * Kept dependency-free (no db / Mailgun / env imports) so it can be used from
 * crons and unit-tested in isolation.
 */

/**
 * The unsubscribe URL captured in the original invite email payload at send
 * time (see `queueInviteEmail`).
 *
 * Reminder crons reuse this instead of re-deriving the token from the RSVP URL.
 * The old approach (`rsvpUrl.split("/rsvp/").pop()`) was coupled to a single
 * literal path segment: if the invite link format ever changed (e.g. to
 * `/invite/<token>`) the split would silently return the whole URL as the
 * "token" and produce a broken unsubscribe link — a no-throw failure that ships
 * green. The stored `unsubscribeUrl` is the authoritative value and is
 * format-agnostic.
 */
export function getUnsubscribeUrlFromPayload(
  payload: unknown,
): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>).unsubscribeUrl;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
