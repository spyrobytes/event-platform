/**
 * Shared map utilities — pure functions only.
 *
 * Consumed by MapEditor and the per-template map renderers so iframe URLs,
 * directions links, and coordinate validation live in one place.
 */

export type LocationForMap = {
  venueName?: string;
  // Legacy alias from Phase 1 schema; Phase 2 adds formattedAddress.
  address?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
};

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

// Phase 1 reads `address`; Phase 2 will populate `formattedAddress` and this
// preference order makes the migration a no-op at the call sites.
export function getDisplayAddress(loc: LocationForMap): string | undefined {
  return loc.formattedAddress?.trim() || loc.address?.trim() || undefined;
}

// Accepts (0, 0) — equator/Greenwich is valid. The truthiness check this
// replaces silently rejected it.
export function hasValidCoordinates(
  loc: LocationForMap
): loc is LocationForMap & { latitude: number; longitude: number } {
  return (
    typeof loc.latitude === "number" &&
    Number.isFinite(loc.latitude) &&
    loc.latitude >= LAT_MIN &&
    loc.latitude <= LAT_MAX &&
    typeof loc.longitude === "number" &&
    Number.isFinite(loc.longitude) &&
    loc.longitude >= LNG_MIN &&
    loc.longitude <= LNG_MAX
  );
}

// Anchor: zoom 15 → 0.01° matches the hard-coded pad the renderers used
// pre-refactor, so existing previews don't shift.
function zoomToBboxPad(zoom: number): number {
  const anchorZoom = 15;
  const anchorPad = 0.01;
  return anchorPad * Math.pow(2, anchorZoom - zoom);
}

// OSM's public export/embed endpoint is rate-limited and not appropriate for
// high-volume production rendering. Phase 5 picks a production provider.
export function getOsmEmbedPreviewUrl(loc: LocationForMap): string | null {
  if (!hasValidCoordinates(loc)) return null;

  const zoom = typeof loc.zoom === "number" && Number.isFinite(loc.zoom) ? loc.zoom : 15;
  const pad = zoomToBboxPad(zoom);

  const minLon = loc.longitude - pad;
  const minLat = loc.latitude - pad;
  const maxLon = loc.longitude + pad;
  const maxLat = loc.latitude + pad;

  const params = new URLSearchParams({
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
    layer: "mapnik",
    marker: `${loc.latitude},${loc.longitude}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

// Falls back to address search so the link still works for drafts and outdoor
// venues without postal addresses. Returns null only when there is no
// location data at all.
export function getGoogleDirectionsUrl(loc: LocationForMap): string | null {
  if (hasValidCoordinates(loc)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`;
  }
  const query = getDisplayAddress(loc) ?? loc.venueName?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getAppleMapsUrl(loc: LocationForMap): string | null {
  if (hasValidCoordinates(loc)) {
    const label = encodeURIComponent(loc.venueName?.trim() || "Event location");
    return `https://maps.apple.com/?ll=${loc.latitude},${loc.longitude}&q=${label}`;
  }
  const query = getDisplayAddress(loc) ?? loc.venueName?.trim();
  if (!query) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Parses a user-typed coordinate. Tri-state return so the caller can distinguish:
 *
 *   undefined → user cleared the field (commit as "not set")
 *   null      → invalid input (do not commit; caller may show inline error)
 *   number    → valid coordinate within [min, max]
 *
 * Intentionally rejects bare "-" / "." / "e" so partial keystrokes don't commit
 * NaN, but accepts negative numbers and decimals once they're well-formed.
 */
export function parseOptionalCoordinate(
  raw: string,
  min: number,
  max: number
): number | undefined | null {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

// Explicit default; prevents the V2 vs V1/Conference/Party drift we had
// pre-refactor (V2 was `no-referrer`).
export const MAP_IFRAME_REFERRER_POLICY = "no-referrer-when-downgrade" as const;
