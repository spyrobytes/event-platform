import type { ComponentType } from "react";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

// Template imports
import { WeddingTemplateV1 } from "./WeddingTemplateV1";
import { ConferenceTemplateV1 } from "./ConferenceTemplateV1";
import { PartyTemplateV1 } from "./PartyTemplateV1";

/**
 * Props that all template components must accept
 */
export type TemplateProps = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
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
  wedding_v1: WeddingTemplateV1,
  conference_v1: ConferenceTemplateV1,
  party_v1: PartyTemplateV1,
};

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
export { ConferenceTemplateV1 } from "./ConferenceTemplateV1";
export { PartyTemplateV1 } from "./PartyTemplateV1";
