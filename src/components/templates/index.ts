import type { ComponentType, ReactNode } from "react";
import type { EventPageConfigV1, Section } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

// Template imports
import { WeddingTemplateV1 } from "./WeddingTemplateV1";
import { WeddingTemplate } from "./wedding";
import { WeddingTemplateV2 } from "./wedding-v2";
import { ConferenceTemplateV1 } from "./ConferenceTemplateV1";
import { PartyTemplateV1 } from "./PartyTemplateV1";

// V3 template components (pre-built, lazy-loaded)
import { WeddingEditorialTemplate } from "./wedding-v3/templates/editorial-template";
import { WeddingIntimateNoteTemplate } from "./wedding-v3/templates/intimate-note-template";
import { WeddingFineArtTemplate } from "./wedding-v3/templates/fine-art-template";
import { WeddingGardenHouseTemplate } from "./wedding-v3/templates/garden-house-template";
import { WeddingGrandLuxeTemplate } from "./wedding-v3/templates/grand-luxe-template";
import { WeddingCelebrationTemplate } from "./wedding-v3/templates/celebration-template";

// V3 definition registry — used by capability helpers below to derive
// support flags directly from each template's TemplateDefinition.
import { getV3Definition } from "./wedding-v3";
import { WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS } from "./wedding-v2/couple-photo-frame-options";
import type { CouplePhotoFrameOption } from "./shared/CouplePhotoFrame/frame-options";

/**
 * Temporal data for time-aware page rendering
 */
export type TemporalData = {
  /** Event start date/time (ISO string) */
  startAt: string | null;
  /** Event end date/time (ISO string) */
  endAt: string | null;
  /** Event timezone (IANA timezone string) */
  timezone: string;
  /** RSVP deadline date/time (ISO string) */
  rsvpDeadline: string | null;
  /** Raw typed Event.schedule Json — segment-aware strip states (plan §3.6) */
  schedule?: unknown;
};

/**
 * Per-item snapshot of registry claim state, computed server-side and
 * serialized through as a plain object so client components can hydrate.
 * See src/lib/registry-claims.ts for how this is built.
 */
export type RegistryClaimSummaryDTO = {
  itemId: string;
  claimedByOthers: number;
  myClaimId: string | null;
  myClaimQuantity: number;
};

/**
 * Approved wedding wish, surfaced to the public-facing template by the
 * /e/[slug] and /e/[slug]/wishes pages. Source of truth is the RSVP row
 * (Rsvp.messageToHost + Rsvp.messageStatus="APPROVED"); this DTO is the
 * minimum subset the renderer needs.
 */
export type ApprovedWishDTO = {
  id: string;
  message: string;
  authorName: string;
};

/**
 * Props that all template components must accept
 */
export type TemplateProps = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  /** Event slug — forwarded into the registry section so it can build the
   * "View full registry" CTA href in preview mode. */
  eventSlug?: string;
  /** Temporal data for time-aware rendering */
  temporal?: TemporalData;
  /** Map of registry itemId → claim summary (only present if the viewer is
   * a verified guest and the event has a registry). */
  registryClaims?: Record<string, RegistryClaimSummaryDTO>;
  /** True when the current viewer can submit claim mutations (i.e. arrived
   * via a valid invite token). */
  canClaim?: boolean;
  /** Registry rendering mode:
   * - "preview" (main event page): first 4 items + "View full registry" CTA.
   * - "full" (default, /e/[slug]/registry + organizer preview): all items. */
  registryMode?: "preview" | "full";
  /** Approved wedding wishes — only fetched + passed when the event has a
   * wishes section enabled. Empty array means "section enabled but no
   * approved messages yet"; the renderer then renders nothing. */
  approvedWishes?: ApprovedWishDTO[];
  /** Wishes rendering mode — mirrors registryMode:
   * - "preview" (main event page): first previewCount + "View all" CTA.
   * - "full" (/e/[slug]/wishes): all approved wishes. */
  wishesMode?: "preview" | "full";
  /** Livestream rendering mode — mirrors registryMode/wishesMode:
   * - "preview" (main event page): compact CTA card linking to /e/[slug]/live.
   * - "full" (/e/[slug]/live): the actual iframe player + countdown/replay UX. */
  livestreamMode?: "preview" | "full";
  /** Server-captured `Date.now()` at request time, seeded into the livestream
   * section's `nowMs` state so the SSR'd phase matches the real clock instead
   * of the 1970 placeholder. Without this, a stream that's already started
   * (or ended) renders "hasn't started" until the client tick fires. The
   * value is hydration-stable because it's a prop, not Date.now() at render. */
  initialNowMs?: number;
  /** Guest invite token from the `tk` query param. Forwarded to the wishes
   * "View all" CTA so the full page preserves authenticated guest context. */
  inviteToken?: string;
  /** When set, the template is rendering a sub-page (e.g. /e/[slug]/registry
   * or /e/[slug]/wishes). Nav links for sections not on this page become
   * cross-page links: `${navLinkBase}#sectionId`. */
  navLinkBase?: string;
  /** Names which section type is the focus of the current sub-page render.
   * When set alongside navLinkBase, only the named section renders in the
   * body (others appear only as cross-page nav links). Required for
   * /e/[slug]/registry ("registry") and /e/[slug]/wishes ("wishes"). */
  subPageSection?: Section["type"];
  /** True when the event is PUBLIC and may surface a share affordance.
   * Templates pass this through to chrome (topbar/footer share buttons).
   * UNLISTED and PRIVATE events stay false — broadcasting them defeats
   * the visibility contract. */
  canShare?: boolean;
  /** Pre-rendered "View Photos" CTA for the post-event gallery. Templates
   * insert it just after their hero block when set. Page-level logic
   * decides when to render this (gallery PUBLISHED + feature flag);
   * templates only need to drop it in the right spot. */
  postEventGalleryCta?: ReactNode;
  /** Pre-rendered teaser block for the post-event gallery. Templates
   * insert it immediately before their footer when set. Same page-level
   * gating as `postEventGalleryCta`. */
  postEventGalleryTeaser?: ReactNode;
  /** When a post-event gallery is published, templates inject a
   * "Photos" item into their nav so guests can reach it from the top
   * of the page instead of scrolling all the way down to the teaser.
   * Unset = no nav entry. Same page-level gating as the CTA + teaser. */
  postEventGalleryHref?: string;
};

/**
 * Template component type
 */
export type TemplateComponent = ComponentType<TemplateProps>;

/**
 * Template registry - maps template IDs to their components
 *
 * When adding a new template:
 * 1. Create the template directory in src/components/templates/
 * 2. Implement the template component
 * 3. Add it to this registry
 * 4. Add seed data to supabase/seed.sql
 */
export const TEMPLATES: Record<string, TemplateComponent> = {
  // Variant-aware wedding template (supports classic, modern_minimal, rustic_outdoor, destination, intimate_micro)
  wedding_v1: WeddingTemplate,
  // Legacy wedding template (for backward compatibility if needed)
  wedding_v1_legacy: WeddingTemplateV1,
  // Cinematic wedding template (V2)
  wedding_v2: WeddingTemplateV2,
  // V3 unique editorial templates
  wedding_editorial: WeddingEditorialTemplate,
  wedding_intimate_note: WeddingIntimateNoteTemplate,
  wedding_fine_art: WeddingFineArtTemplate,
  wedding_garden_house: WeddingGardenHouseTemplate,
  wedding_grand_luxe: WeddingGrandLuxeTemplate,
  wedding_celebration: WeddingCelebrationTemplate,
  conference_v1: ConferenceTemplateV1,
  party_v1: PartyTemplateV1,
};

/**
 * Templates that render optional social media links in their footer.
 * Capability-flag approach (no billing tier yet) — acts as a Premium gate
 * during invitation phase; V1 templates are excluded by design.
 */
export const TEMPLATES_WITH_SOCIAL_LINKS: ReadonlySet<string> = new Set([
  "wedding_v2",
  "wedding_grand_luxe",
  "wedding_celebration",
]);

export function templateSupportsSocialLinks(templateId: string): boolean {
  return TEMPLATES_WITH_SOCIAL_LINKS.has(templateId);
}

/**
 * Whether this template renders the optional Prelude (welcome note) between
 * Hero and the first section. V3 templates carry `supportsPrelude` on their
 * definition; V2 is treated as always-supporting (its renderer wires the
 * block unconditionally). Single source of truth so editor + renderer can't
 * drift apart when new V3 templates ship.
 */
export function templateSupportsPrelude(templateId: string): boolean {
  if (templateId === "wedding_v2") return true;
  return getV3Definition(templateId)?.supportsPrelude ?? false;
}

/**
 * Whether this template's hero offers the background-treatment toggle
 * (`hero.backgroundTreatment`: ambience | portrait — see event-page schema).
 * Portrait is for a couple photo used AS the hero background: a lighter
 * template-tuned grade, Ken Burns drift disabled, top-anchored crop (heads never clip).
 * V3 templates carry `supportsHeroBackgroundTreatment` on their definition;
 * V2 Cinematic implements it in its hero. Single source of truth so the
 * editor toggle can't light up for a template whose hero ignores the field.
 */
export function templateSupportsHeroBackgroundTreatment(templateId: string): boolean {
  if (templateId === "wedding_v2") return true;
  return getV3Definition(templateId)?.supportsHeroBackgroundTreatment ?? false;
}

/**
 * Whether a template's hero honors `hero.backgroundFocalX` — the horizontal
 * anchor for the mobile cover-crop (see the schema). Single source of truth so
 * the editor's focal-point control can't light up for a hero that ignores it.
 * V2 Cinematic implements it directly; V3 templates carry `supportsHeroFocalX`
 * on their definition (set only on single full-bleed cover heroes — Grand Luxe
 * and Celebration today; multi-image mosaics don't qualify).
 */
export function templateSupportsHeroFocalX(templateId: string): boolean {
  if (templateId === "wedding_v2") return true;
  return getV3Definition(templateId)?.supportsHeroFocalX ?? false;
}

/**
 * Curated couple-photo frame shapes for a template's hero, or undefined when
 * the template has no couple photo. The first option is the template's
 * default. V3 templates carry `couplePhotoFrameOptions` on their definition;
 * V2 Cinematic curates its own list. Single source of truth — the editor's
 * couple-photo block (picker + frame toggle) is gated on this, so enrolling a
 * new template here is what lights the UI up.
 */
export function getCouplePhotoFrameOptions(
  templateId: string,
): CouplePhotoFrameOption[] | undefined {
  if (templateId === "wedding_v2") return WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS;
  return getV3Definition(templateId)?.couplePhotoFrameOptions;
}

/**
 * Get a template component by ID
 * Returns undefined if template not found
 */
export function getTemplate(templateId: string): TemplateComponent | undefined {
  return TEMPLATES[templateId];
}

/**
 * Check if a template exists
 */
export function templateExists(templateId: string): boolean {
  return templateId in TEMPLATES;
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}

// Re-export templates for direct import
export { WeddingTemplateV1 } from "./WeddingTemplateV1";
export { WeddingTemplate } from "./wedding";
export { WeddingTemplateV2 } from "./wedding-v2";
export { ConferenceTemplateV1 } from "./ConferenceTemplateV1";
export { PartyTemplateV1 } from "./PartyTemplateV1";

// Re-export wedding variant utilities
export {
  getWeddingVariant,
  getAllVariantsDisplayInfo,
  getVariantsByCategory,
  WEDDING_VARIANTS,
  DEFAULT_VARIANT_ID,
} from "./wedding";
