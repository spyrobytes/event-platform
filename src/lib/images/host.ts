/**
 * Host check for next/image with the custom Supabase loader.
 *
 * next.config.ts configures `loader: "custom"` pointing at
 * src/lib/images/supabase-loader.ts, so `<Image>` calls the loader directly
 * and never hits next/image's `/_next/image` route — `remotePatterns`
 * validation does NOT enforce a runtime throw in this codebase.
 *
 * The supabase-loader is a passthrough: it returns `src` unchanged (we serve
 * the already-sharp-optimized stored object rather than paying for Supabase's
 * `/render/image/` transform endpoint — see supabase-loader.ts for why). That
 * means it returns the same URL at every srcset width, producing a degenerate
 * srcset of identical URLs for *any* image.
 *
 * To avoid emitting N identical srcset entries, callers should pass
 * `unoptimized={!isAllowedImageHost(url)}` to `<Image>` for external/unknown
 * hosts (`unoptimized=true` suppresses srcset generation, rendering a single
 * direct request). Supabase-hosted URLs are still served directly by the
 * passthrough loader — the browser fetches the one stored object.
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
 * (NEXT_PUBLIC_SUPABASE_URL), meaning the custom supabase-loader can
 * transform it for AVIF/WebP delivery.
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
