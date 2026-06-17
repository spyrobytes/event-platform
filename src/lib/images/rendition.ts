/**
 * Responsive-rendition naming + selection convention (Tier 2 / issue #211).
 *
 * This module is PURE and client-safe (no server imports) so it can be shared by
 * the next/image loader (client), the EventImage wrapper (client), and the
 * storage path helper (server) — a single source of truth so they never drift.
 *
 * The next/image loader is a stateless `(src, width) => url` function with no
 * I/O, so it cannot look up which renditions exist for an asset. Instead the
 * EventImage wrapper, which has the asset's `renditionWidths`, encodes them onto
 * the `src` as a marker; the loader decodes it and picks the nearest stored
 * rendition. A src WITHOUT the marker is passed through unchanged — that's the
 * graceful fallback for un-backfilled assets, non-HERO assets, and external
 * images.
 */

/** Marker appended to a src to carry the available rendition widths, e.g.
 *  "https://…/123.webp?rw=384,640,828,1200". */
export const RENDITION_MARKER = "?rw=";

/**
 * Inserts "_w{width}" before the ".webp" extension of a storage path or URL,
 * e.g. ".../123.webp" + 640 -> ".../123_w640.webp". The naming convention for
 * a rendition file relative to its original.
 */
export function insertRenditionWidth(pathOrUrl: string, width: number): string {
  return pathOrUrl.replace(/\.webp$/i, `_w${width}.webp`);
}

/**
 * Encodes available rendition widths onto a base URL for the loader to read.
 * Returns the base unchanged when there are no renditions (the loader then
 * passes it through to the original).
 */
export function withRenditionWidths(
  baseUrl: string,
  widths: readonly number[]
): string {
  if (widths.length === 0) return baseUrl;
  return `${baseUrl}${RENDITION_MARKER}${widths.join(",")}`;
}

/**
 * Loader selection: given a (possibly marker-carrying) src and the width
 * next/image requested, returns the URL to fetch.
 *
 * - No marker -> return src unchanged (passthrough: original / external image).
 * - Marker present -> pick the smallest stored rendition >= the requested width;
 *   if the request exceeds every rendition, return the original (the base URL),
 *   which serves the top of the ladder.
 */
export function resolveRenditionUrl(src: string, requestedWidth: number): string {
  const markerAt = src.indexOf(RENDITION_MARKER);
  if (markerAt === -1) return src;

  const base = src.slice(0, markerAt);
  const widths = src
    .slice(markerAt + RENDITION_MARKER.length)
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (widths.length === 0) return base;

  const rung = widths.find((w) => w >= requestedWidth);
  return rung === undefined ? base : insertRenditionWidth(base, rung);
}

/**
 * Builds a real `srcSet` of stored rendition rungs for a RAW `<img>` that can't
 * go through next/image + the loader — e.g. the V2 cinematic hero, whose
 * cover/Ken Burns/focal/cutout CSS must stay exactly as hand-tuned. Each entry
 * points at a stored `{base}_w{w}.webp` sibling (passthrough — never the
 * transform endpoint), with the original appended at its intrinsic width as the
 * top rung so large / high-DPR viewports still get full quality (renditions cap
 * below the original). Returns `undefined` when there are no renditions, so the
 * caller omits the attribute and the `<img>` serves `src` unchanged (matching
 * EventImage's passthrough). Pair with an accurate `sizes` to avoid over-fetch.
 */
export function buildRenditionSrcSet(
  baseUrl: string,
  widths: readonly number[],
  originalWidth?: number | null
): string | undefined {
  if (widths.length === 0) return undefined;
  const sorted = [...widths].sort((a, b) => a - b);
  const entries = sorted.map((w) => `${insertRenditionWidth(baseUrl, w)} ${w}w`);
  // Append the stored original at its width as the top rung (renditions only
  // exist for widths strictly below the source, so it's always the largest).
  if (originalWidth && originalWidth > sorted[sorted.length - 1]) {
    entries.push(`${baseUrl} ${originalWidth}w`);
  }
  return entries.join(", ");
}
