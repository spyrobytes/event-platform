import type { ComponentType } from "react";
import type { EventPageConfigV1 } from "@/schemas/event-page";
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
};

/**
 * Props that all template components must accept
 */
export type TemplateProps = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  /** Temporal data for time-aware rendering */
  temporal?: TemporalData;
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
