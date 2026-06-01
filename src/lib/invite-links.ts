/**
 * Canonical guest-facing invitation URL.
 *
 * `/invite/[token]` is the full invitation experience; it routes on to the RSVP
 * form (`/invite/[token]/rsvp`) and, when an invitation config exists,
 * `/rsvp/[token]` redirects here too — so this is the single canonical entry
 * point a guest should ever be handed.
 *
 * Both the phone-only share buttons (WhatsApp / SMS / Copy in InviteManager)
 * and the planning panel's "Copy link" build their link through here, so the
 * two surfaces can't drift apart (they previously split between `/invite` and
 * `/rsvp`, sending guests down different deadline/UX paths).
 */
export function buildInviteUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/invite/${token}`;
}
