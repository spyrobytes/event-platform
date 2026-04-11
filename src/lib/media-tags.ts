/**
 * Media asset tag vocabulary — Phase 1 of Media Library consolidation.
 *
 * Tags describe how an asset can be used across sections of an event page.
 * They are decoupled from the `kind` column (HERO | GALLERY), which stays
 * as the storage-path bucket. One asset can carry multiple tags, so the
 * same photo can simultaneously be a gallery candidate and a portrait.
 */

export const MEDIA_TAGS = [
  "hero",     // Landscape, hero-suitable (event cover / page header)
  "gallery",  // Public photo gallery
  "portrait", // Face-centered (wedding party, speakers)
  "logo",     // Logos for sponsors / registry — transparency-friendly
  "story",    // Story milestones / editorial blocks
] as const;

export type MediaTag = (typeof MEDIA_TAGS)[number];

/**
 * Human-readable labels for the tag picker UI.
 */
export const MEDIA_TAG_LABELS: Record<MediaTag, string> = {
  hero: "Hero",
  gallery: "Gallery",
  portrait: "Portrait",
  logo: "Logo",
  story: "Story",
};

/**
 * Short hint describing what each tag is for, shown in the upload form.
 */
export const MEDIA_TAG_HINTS: Record<MediaTag, string> = {
  hero: "Cover / page header (landscape recommended)",
  gallery: "Public photo gallery",
  portrait: "People photos (wedding party, speakers)",
  logo: "Sponsor / registry logos",
  story: "Our Story milestones",
};

/**
 * Validate that every entry in a candidate array is a known tag.
 */
export function isValidTag(value: unknown): value is MediaTag {
  return typeof value === "string" && (MEDIA_TAGS as readonly string[]).includes(value);
}

/**
 * Derive the legacy `kind` column value from a tag list. Used by the upload
 * API + form to decide which storage-path bucket to place the file in.
 * An asset tagged "hero" goes to the hero bucket; everything else to gallery.
 */
export function deriveKindFromTags(tags: readonly MediaTag[]): "HERO" | "GALLERY" {
  return tags.includes("hero") ? "HERO" : "GALLERY";
}
