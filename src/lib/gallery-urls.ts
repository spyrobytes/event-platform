/**
 * Visible label for the post-event gallery's nav entry across V1
 * (mobile drawer), V2 (Topbar), and V3 (NavComponent). Distinct from
 * the in-page "gallery" section's label ("Gallery") so guests can
 * tell pre-event teaser from post-event destination at a glance.
 *
 * Keep here so the three template integrations stay in lockstep —
 * relabeling becomes a one-place edit.
 */
export const POST_EVENT_GALLERY_NAV_LABEL = "Album";

/**
 * Synthetic nav-item id used by the three template nav builders for
 * the post-event gallery entry. Lowercase + stable so any future
 * client-side active-state highlighting can target it.
 */
export const POST_EVENT_GALLERY_NAV_ID = "album";

/**
 * Shared URL builders for post-event gallery surfaces.
 *
 * Previously duplicated as a tk-aware ternary across `HeroPostEventCta`,
 * `PostEventGalleryTeaser`, and `/e/[slug]/page.tsx` (PR E's review
 * flagged this). One source of truth so a future change (utm tags,
 * short-URL migration, whatever) is a one-line edit.
 *
 * The `inviteToken` is propagated when present so guests viewing a
 * token-gated event can navigate without losing their access. The
 * caller is responsible for tokenInvalid handling (see PR E's review
 * fix #2 in `/e/[slug]/page.tsx`); this helper only encodes whatever
 * token it's given.
 */
export function buildPublicGalleryHref(
  eventSlug: string,
  inviteToken?: string,
): string {
  return inviteToken
    ? `/e/${eventSlug}/gallery?tk=${encodeURIComponent(inviteToken)}`
    : `/e/${eventSlug}/gallery`;
}

/**
 * Higher-level resolver that bakes the visibility + token-validity
 * gates into the URL decision. Use this from page-level code that
 * threads `postEventGalleryHref` into a template — the sub-pages
 * (/wishes, /registry, /live) and the main `/e/[slug]` page all need
 * the same three branches:
 *
 *   1. No published gallery → undefined (the nav entry is suppressed).
 *   2. Valid token → URL with `?tk=` so guests don't lose access.
 *   3. Invalid token on a PRIVATE event → undefined (the gallery
 *      would 404; better to hide the link than advertise a dead path —
 *      PR E's review fix #2).
 *   4. No / invalid token on PUBLIC/UNLISTED → tokenless URL.
 *
 * Centralizing here means a future visibility model change is a
 * one-place edit.
 *
 * `eventVisibility` is the Prisma `EventVisibility` enum value — typed
 * tightly so callers can't pass an arbitrary string. Adding a new
 * visibility level forces this resolver to be revisited (TypeScript
 * will fail on the call site that constructed the missing case).
 */
import type { EventVisibility } from "@prisma/client";

export function resolvePostEventGalleryHref(args: {
  hasPublishedGallery: boolean;
  eventSlug: string;
  eventVisibility: EventVisibility;
  inviteToken?: string;
  tokenInvalid?: boolean;
}): string | undefined {
  if (!args.hasPublishedGallery) return undefined;
  if (args.inviteToken && !args.tokenInvalid) {
    return buildPublicGalleryHref(args.eventSlug, args.inviteToken);
  }
  if (args.eventVisibility === "PRIVATE") return undefined;
  return buildPublicGalleryHref(args.eventSlug);
}
