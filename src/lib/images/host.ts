/**
 * Host check for next/image with the custom Supabase loader.
 *
 * next.config.ts configures `loader: "custom"` pointing at
 * src/lib/images/supabase-loader.ts, so `<Image>` calls the loader directly
 * and never hits next/image's `/_next/image` route — `remotePatterns`
 * validation does NOT enforce a runtime throw in this codebase. What matters
 * is whether the loader can usefully transform the URL.
 *
 * The supabase-loader only transforms URLs under `/storage/v1/object/public/`
 * (rewriting them to the Supabase image-render endpoint for AVIF/WebP
 * delivery). For any other URL — external hosts, signed Supabase URLs,
 * already-transformed render URLs — the loader returns `src` unchanged at
 * every srcset width, producing a degenerate srcset of identical URLs.
 *
 * To avoid that, callers should pass `unoptimized={!isAllowedImageHost(url)}`
 * to `<Image>`. `unoptimized=true` suppresses srcset generation entirely, so
 * external URLs render as a single direct request instead of N identical ones.
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
