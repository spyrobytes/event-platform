/**
 * Slugs that an organizer must not be able to claim for an event.
 *
 * Two categories:
 *  1. Real top-level routes / static assets in `src/app` — claiming these
 *     would shadow or collide with framework routing.
 *  2. Likely-future top-level paths (auth, billing, marketing pages, …).
 *     Reserving them now is cheap and avoids painful renames later.
 *
 * Update this list when you add a new top-level route under `src/app/`.
 * Route groups in parentheses (e.g. `(auth)`, `(marketing)`) don't appear
 * in URLs and don't need to be reserved.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Existing top-level URL segments
  "api",
  "e",
  "invite",
  "preview",
  "rsvp",
  "test",
  "unsubscribe",

  // Static assets served from /
  "favicon.ico",
  "apple-icon.png",
  "icon.png",
  "icon.svg",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",

  // Reserved by Next.js / Vercel
  "_next",
  "_vercel",

  // Likely-future surfaces
  "dashboard",
  "admin",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "account",
  "settings",
  "billing",
  "discover",
  "events",
  "about",
  "pricing",
  "terms",
  "privacy",
  "contact",
  "help",
  "blog",
  "docs",
  "support",
  "cron",
  "webhooks",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
