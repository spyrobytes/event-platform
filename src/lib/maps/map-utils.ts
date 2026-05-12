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
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
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

export type MapPublishValidation =
  | { ok: true }
  | { ok: false; reason: string; sectionIndex?: number };

// Phase 2 publish gate. Disabled sections always pass — they don't render.
// Enabled sections need a displayable address (formattedAddress, legacy
// address, or any structured address part) AND valid coordinates. The schema
// allows partial drafts to save; this function is the contract enforced at
// publish time so live pages don't render with missing or Null Island data.
export function validateMapSectionForPublish(section: {
  enabled: boolean;
  data: LocationForMap;
}): MapPublishValidation {
  if (!section.enabled) return { ok: true };

  const hasAddress =
    Boolean(getDisplayAddress(section.data)) ||
    Boolean(section.data.addressLine1?.trim()) ||
    Boolean(section.data.city?.trim()) ||
    Boolean(section.data.region?.trim()) ||
    Boolean(section.data.postalCode?.trim()) ||
    Boolean(section.data.country?.trim());

  if (!hasAddress) {
    return { ok: false, reason: "Map section needs an address before publishing." };
  }
  if (!hasValidCoordinates(section.data)) {
    return { ok: false, reason: "Map section needs valid coordinates before publishing." };
  }
  return { ok: true };
}

// Returns the data of the first enabled map section in a page config, or
// undefined when no enabled map section exists. Used by SEO surfaces (e.g.
// EventJsonLd) that want the structured address + geo when the section
// contributes to the public page, and want to omit those fields otherwise.
type ConfigForLookup = {
  sections: ReadonlyArray<{ type: string; enabled?: boolean; data?: unknown }>;
};
export function getEnabledMapSection(
  config: ConfigForLookup
): Record<string, unknown> | undefined {
  for (const section of config.sections) {
    if (section.type !== "map") continue;
    if (section.enabled === false) continue;
    if (!section.data || typeof section.data !== "object") continue;
    return section.data as Record<string, unknown>;
  }
  return undefined;
}

// Walks a page config's sections and validates each enabled map section.
// Returns the first failure with sectionIndex so the API can point the editor
// at the offending card. The publish path uses this; the save path doesn't
// (drafts are allowed to be incomplete).
type SectionForCheck = { type: string; enabled?: boolean; data?: unknown };

// Runtime narrowing: confirms a section has the shape `validateMapSectionForPublish`
// requires (an `enabled` boolean and a non-null `data` object) before handing it
// across the type boundary. Avoids the `as unknown as ...` cast and keeps the
// type-safety story honest if either side's shape ever drifts.
function isMapSectionForValidation(
  section: SectionForCheck
): section is { type: "map"; enabled: boolean; data: Record<string, unknown> } {
  return (
    section.type === "map" &&
    typeof section.enabled === "boolean" &&
    section.data !== null &&
    typeof section.data === "object"
  );
}

export function validateMapSectionsInConfig(config: {
  sections: ReadonlyArray<SectionForCheck>;
}): MapPublishValidation {
  for (let i = 0; i < config.sections.length; i++) {
    const section = config.sections[i];
    if (section.type !== "map") continue;
    if (!isMapSectionForValidation(section)) continue;
    const result = validateMapSectionForPublish(section);
    if (!result.ok) return { ...result, sectionIndex: i };
  }
  return { ok: true };
}
