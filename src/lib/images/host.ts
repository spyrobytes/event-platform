/**
 * Host whitelist check for next/image.
 *
 * next.config.ts only configures the Supabase project host in `remotePatterns`.
 * When `<Image src={url}>` receives a URL whose hostname isn't on that list,
 * Next.js throws at render time. Plain `<img>` accepted any URL, so the
 * migration to `next/image` is a hard regression for events that store
 * heroImageUrls hosted outside Supabase (e.g., legacy data, externally-
 * uploaded photos).
 *
 * This helper returns `true` when the URL's hostname matches the configured
 * Supabase host. Callers should pass `unoptimized={!isAllowedImageHost(url)}`
 * to `<Image>` for external URLs — `unoptimized` bypasses both the custom
 * loader and the remotePatterns check, restoring the prior plain-img behavior
 * for unknown hosts while keeping optimization on known ones.
 */

let cachedSupabaseHost: string | null | undefined;

function getSupabaseHost(): string | null {
  if (cachedSupabaseHost !== undefined) return cachedSupabaseHost;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  if (!supabaseUrl) {
    cachedSupabaseHost = null;
    return null;
  }
  try {
    cachedSupabaseHost = new URL(supabaseUrl).hostname;
  } catch {
    cachedSupabaseHost = null;
  }
  return cachedSupabaseHost;
}

/**
 * Returns true if the URL's hostname is configured in next.config.ts's
 * image remotePatterns and is safe to render through next/image's optimizer.
 *
 * Returns false for malformed URLs, relative paths, data URIs, and any
 * host outside the configured whitelist.
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
