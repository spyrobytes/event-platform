/**
 * Helpers for reading values back out of a stored `email_outbox.payload`.
 *
 * Kept dependency-free (no db / Mailgun / env imports) so it can be used from
 * crons and unit-tested in isolation.
 */

/**
 * The unsubscribe URL for a reminder, resolved from the original invite email
 * payload (see `queueInviteEmail`).
 *
 * Prefers the stored `unsubscribeUrl` — the authoritative value captured at
 * send time, format-agnostic. Reminder crons reuse it instead of re-deriving
 * the token from the RSVP URL: the old `rsvpUrl.split("/rsvp/").pop()` was
 * coupled to a single literal path segment and would silently return the whole
 * URL as the "token" (a broken link that ships green) if the invite link format
 * ever changed (e.g. to `/invite/<token>`).
 *
 * Fallback: invite emails predate the `unsubscribeUrl` field (it was added on
 * 2026-04-08; invites have been sent since 2026-01-12), so payloads from that
 * window carry only `rsvpUrl`. For those, derive the unsubscribe URL by mapping
 * the `/rsvp/` path to `/unsubscribe/` — reusing the base + token already in
 * `rsvpUrl` (so no env lookup, and the send-time host is preserved). This only
 * runs for legacy payloads, which are always old-format `/rsvp/<token>`; any
 * newer/`/invite/` payload carries `unsubscribeUrl` and returns above, so the
 * fragile path can't be reached by a future link-format change.
 */
export function getUnsubscribeUrlFromPayload(
  payload: unknown,
): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const { unsubscribeUrl, rsvpUrl } = payload as Record<string, unknown>;

  if (typeof unsubscribeUrl === "string" && unsubscribeUrl.length > 0) {
    return unsubscribeUrl;
  }

  // Legacy fallback — see doc comment. `.replace` swaps only the first match.
  if (typeof rsvpUrl === "string" && rsvpUrl.includes("/rsvp/")) {
    return rsvpUrl.replace("/rsvp/", "/unsubscribe/");
  }

  return undefined;
}
