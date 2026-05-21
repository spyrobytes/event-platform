/**
 * Shared constants for the public-portal RSVP UI surface.
 *
 * The session token itself lives in an httpOnly cookie scoped to
 * /api/rsvp/public — out of JS reach. The InvitePreview is non-sensitive
 * (guest-facing display only) and gets stashed in sessionStorage so the
 * /respond page can render without an extra round trip. sessionStorage is
 * tab-scoped and cleared on close, which matches the 20-min session.
 */

export const SESSION_PREVIEW_KEY = "rsvp_invite_preview";

export type InvitePreview = {
  name: string | null;
  hasEmail: boolean;
  plusOnesAllowed: number;
  /** Mirrors the regular flow's `enableWishes`: true when the event's
   *  `wishes` section is enabled and accepting submissions. Surfaces the
   *  "Message for the couple" textarea on the respond form. */
  enableWishes: boolean;
  /** Event templateId — drives wedding-only UI on the respond form (side
   *  selector). Optional for backward compat with sessions written by
   *  older clients still in sessionStorage. */
  templateId?: string | null;
};

export function readInvitePreview(): InvitePreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.hasEmail === "boolean" &&
      typeof parsed?.plusOnesAllowed === "number"
    ) {
      // `enableWishes` was added after initial rollout; default to false for
      // sessions written by older clients still in sessionStorage.
      return {
        ...parsed,
        enableWishes: typeof parsed?.enableWishes === "boolean" ? parsed.enableWishes : false,
        templateId: typeof parsed?.templateId === "string" ? parsed.templateId : null,
      } as InvitePreview;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeInvitePreview(preview: InvitePreview): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_PREVIEW_KEY, JSON.stringify(preview));
}

export function clearInvitePreview(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_PREVIEW_KEY);
}
