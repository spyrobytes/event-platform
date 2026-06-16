/**
 * Host check for next/image with the custom Supabase loader.
 *
 * next.config.ts configures `loader: "custom"` pointing at
 * src/lib/images/supabase-loader.ts, so `<Image>` calls the loader directly
 * and never hits next/image's `/_next/image` route — `remotePatterns`
 * validation does NOT enforce a runtime throw in this codebase.
 *
 * The supabase-loader selects a stored rendition only when `src` carries the
 * `?rw=` marker (added by EventImage for assets that have renditions); any other
 * `src` is returned unchanged. So an undecorated URL yields the same URL at
 * every srcset width — a degenerate srcset of identical URLs.
 *
 * To avoid emitting N identical srcset entries for images that have NO
 * renditions, callers should pass `unoptimized={!isAllowedImageHost(url)}` to
 * `<Image>` for external/unknown hosts (`unoptimized=true` suppresses srcset
 * generation, rendering a single direct request). Decorated Supabase URLs do
 * produce a real, useful srcset of distinct stored renditions.
 */

let cachedSupabaseHost: string | undefined;

function getSupabaseHost(): string | null {
  if (cachedSupabaseHost) return cachedSupabaseHost;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl) return null;
  try {
    cachedSupabaseHost = new URL(supabaseUrl).hostname;
    return cachedSupabaseHost;
  } catch {
    return null;
  }
}

/**
 * Returns true if the URL's hostname matches the configured Supabase host
 * (NEXT_PUBLIC_SUPABASE_URL). Such URLs are served directly by the passthrough
 * supabase-loader (the already-sharp-optimized stored object), so the browser
 * fetches a single stored file rather than N transformed renditions.
 *
 * Returns false for malformed URLs, relative paths, data URIs, missing env,
 * and any host outside the configured Supabase project. Callers should set
 * `unoptimized={true}` for those — see file-level comment for why.
 */
export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  const allowedHost = getSupabaseHost();
  if (!allowedHost) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === allowedHost;
  } catch {
    return false;
  }
}
