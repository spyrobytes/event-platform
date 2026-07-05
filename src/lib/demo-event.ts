/**
 * Sentinel event slug for the public /sample-templates/* demo pages.
 *
 * Demo pages render real templates with sample data but no backing Event
 * row. Templates require an `eventSlug` to render RSVP/registry/wishes
 * surfaces, so demos pass this sentinel. Underscores are invalid in real
 * slugs (see `eventSlugSchema`), so it can never collide with an
 * organizer-claimed slug.
 *
 * Two consumers react to it:
 *  - `RsvpCta` swaps the RSVP portal link for a "Create your own page"
 *    sign-up CTA.
 *  - `next.config.ts` redirects `/e/__demo__/:path*` → `/join` as a safety
 *    net for template hrefs built from the slug (nav RSVP pill, registry /
 *    wishes CTAs, share URL).
 */
export const DEMO_EVENT_SLUG = "__demo__";

export function isDemoEventSlug(slug: string | undefined): boolean {
  return slug === DEMO_EVENT_SLUG;
}
