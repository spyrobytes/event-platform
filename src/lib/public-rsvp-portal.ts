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
  /** True for wedding-family events — surfaces the side selector on the
   *  respond form. Computed server-side from the event's template family.
   *  Optional for backward compat with sessions written by older clients
   *  still in sessionStorage. */
  showSideField?: boolean;
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
        showSideField: typeof parsed?.showSideField === "boolean" ? parsed.showSideField : false,
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
