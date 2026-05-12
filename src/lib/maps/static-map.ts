/**
 * Static map image URLs — server- and client-callable.
 *
 * The URL points at OUR proxy route (`/api/maps/static`), NOT directly at
 * LocationIQ. Two reasons:
 *
 *   1. Key secrecy: LocationIQ's free tier permits one access token shared
 *      across all envs. Embedding it in an `<img src>` would leak it into
 *      page HTML — anyone could scrape it and burn our daily quota.
 *      LocationIQ free tier doesn't offer referrer-restricted public keys
 *      (that's a paid feature), so the proxy is the cleanest mitigation.
 *
 *   2. Provider portability: if Phase 5+ swaps to Mapbox Static Images for
 *      branded tiles, the swap is one server file — every consumer URL
 *      stays `/api/maps/static?...`.
 */

import { hasValidCoordinates, type LocationForMap } from "@/lib/maps/map-utils";

export type StaticMapOptions = {
  /** Width in pixels. Default 600 (OG-friendly small banner). */
  width?: number;
  /** Height in pixels. Default 400. */
  height?: number;
  /** Map zoom level (LocationIQ accepts 1–18). Default 15. */
  zoom?: number;
};

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_ZOOM = 15;

/**
 * Builds a proxy URL for a static map image of the given location.
 *
 * Returns null when coordinates are absent — callers should fall back to
 * a different image (event cover photo, generic placeholder, etc.).
 *
 * The proxy URL is deterministic from inputs so browsers, CDNs, and
 * social-share crawlers cache it well — per-event load on LocationIQ's
 * tile service stays at roughly one transaction across all consumers.
 */
export function getStaticMapImageUrl(
  loc: LocationForMap,
  options: StaticMapOptions = {}
): string | null {
  if (!hasValidCoordinates(loc)) return null;

  const params = new URLSearchParams({
    lat: String(loc.latitude),
    lng: String(loc.longitude),
    w: String(options.width ?? DEFAULT_WIDTH),
    h: String(options.height ?? DEFAULT_HEIGHT),
    z: String(options.zoom ?? loc.zoom ?? DEFAULT_ZOOM),
  });

  return `/api/maps/static?${params.toString()}`;
}

/**
 * Absolute version of `getStaticMapImageUrl` — required for OpenGraph
 * metadata (social-share crawlers can't resolve relative URLs).
 *
 * `baseUrl` should be the canonical site origin (typically
 * `NEXT_PUBLIC_BASE_URL`). Returns null when coords absent.
 */
export function getAbsoluteStaticMapImageUrl(
  loc: LocationForMap,
  baseUrl: string,
  options: StaticMapOptions = {}
): string | null {
  const path = getStaticMapImageUrl(loc, options);
  if (!path) return null;
  // Trim trailing slash on baseUrl to avoid `//api/...`.
  const origin = baseUrl.replace(/\/+$/, "");
  return `${origin}${path}`;
}
