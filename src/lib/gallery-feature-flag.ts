/**
 * Single env-driven feature flag for the post-event gallery rollout.
 *
 * Gates the dashboard nav link, dashboard pages, API routes, and public
 * surfaces (teaser / dedicated route). Removable post-GA once the feature
 * is generally available.
 *
 * Two env vars exist intentionally:
 *   - POST_EVENT_GALLERY_ENABLED         — server (API routes, server pages)
 *   - NEXT_PUBLIC_POST_EVENT_GALLERY_ENABLED — client (dashboard nav button)
 * In production set BOTH to "true". The client flag is for UI affordances
 * only — it does not protect anything; server routes always re-check.
 */
export function isPostEventGalleryEnabled(): boolean {
  return process.env.POST_EVENT_GALLERY_ENABLED === "true";
}

/**
 * Client-safe check. Reads NEXT_PUBLIC_POST_EVENT_GALLERY_ENABLED. Safe to
 * call from "use client" components — the value is baked in at build time.
 */
export function isPostEventGalleryEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_POST_EVENT_GALLERY_ENABLED === "true";
}
