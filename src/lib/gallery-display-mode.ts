import type { TemplateId } from "@/schemas/event";

/**
 * Which templates honor the gallery `displayMode` field
 * (grid / carousel / masonry / slideshow).
 *
 * V3 wedding templates resolve a FIXED, curated gallery renderer in
 * `createWeddingTemplate` (`definition.galleryRenderer`) and never read
 * `displayMode`, so the editor must not offer the mode / transition / auto-play
 * controls for them — an organizer picking "Carousel" there would silently
 * no-op. V1, V2 (standard), Conference, and Party render galleries that DO honor
 * `displayMode`.
 *
 * Exhaustive over `TemplateId`: a newly added template won't compile until it's
 * classified here, so this gate can't silently drift as templates are added.
 *
 * NB: `wedding_v2` honors modes only in its STANDARD variant — its scrapbook
 * variant swaps in `ScrapbookCollage` and ignores `displayMode`. That is a
 * variant-level fact the caller must gate separately (e.g. `&& !isScrapbook`);
 * this map captures only the renderer-level, template-id fact.
 */
const TEMPLATE_HONORS_GALLERY_DISPLAY_MODE: Record<TemplateId, boolean> = {
  wedding_v1: true,
  wedding_v2: true, // standard variant only; scrapbook gated by the caller
  wedding_editorial: false,
  wedding_intimate_note: false,
  wedding_fine_art: false,
  wedding_garden_house: false,
  wedding_grand_luxe: false,
  wedding_celebration: false,
  conference_v1: true,
  party_v1: true,
};

/**
 * True when the template's gallery renderer reads the `displayMode` field, so the
 * editor should show the display-mode controls. Defaults to `false` for unknown /
 * missing ids (don't offer a control we can't confirm is wired).
 */
export function templateHonorsGalleryDisplayMode(
  templateId: string | null | undefined,
): boolean {
  if (!templateId) return false;
  return TEMPLATE_HONORS_GALLERY_DISPLAY_MODE[templateId as TemplateId] ?? false;
}
