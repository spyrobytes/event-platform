export { EnvelopeReveal } from "./EnvelopeReveal";

// Future templates will be exported here:
// export { LayeredUnfold } from "./LayeredUnfold";
// export { CinematicScroll } from "./CinematicScroll";
// export { TimeBasedReveal } from "./TimeBasedReveal";

import type { ComponentType, ReactNode } from "react";
import type { InvitationState } from "@/hooks";
import { EnvelopeReveal } from "./EnvelopeReveal";

/**
 * Common props shared by all invitation templates
 */
export type InvitationTemplateProps = {
  children: ReactNode;
  autoOpen?: boolean;
  initialState?: InvitationState;
  onStateChange?: (state: InvitationState) => void;
  showReplay?: boolean;
  className?: string;
};

/**
 * Template ID type (matches Prisma enum)
 */
export type TemplateId =
  | "ENVELOPE_REVEAL"
  | "LAYERED_UNFOLD"
  | "CINEMATIC_SCROLL"
  | "TIME_BASED_REVEAL";

/**
 * Registry of available invitation templates
 */
const templateRegistry: Record<
  TemplateId,
  ComponentType<InvitationTemplateProps> | null
> = {
  ENVELOPE_REVEAL: EnvelopeReveal,
  LAYERED_UNFOLD: null, // Coming in Phase 5
  CINEMATIC_SCROLL: null, // Coming in Phase 5
  TIME_BASED_REVEAL: null, // Coming in Phase 6
};

/**
 * Template metadata for UI display
 */
export const templateMetadata: Record<
  TemplateId,
  {
    name: string;
    description: string;
    available: boolean;
  }
> = {
  ENVELOPE_REVEAL: {
    name: "Envelope Reveal",
    description: "Classic envelope opening animation",
    available: true,
  },
  LAYERED_UNFOLD: {
    name: "Layered Unfold",
    description: "Modern card unfolding sequence",
    available: false,
  },
  CINEMATIC_SCROLL: {
    name: "Cinematic Scroll",
    description: "Story-driven scroll experience",
    available: false,
  },
  TIME_BASED_REVEAL: {
    name: "Time-Based Reveal",
    description: "Dramatic auto-playing presentation",
    available: false,
  },
};

/**
 * Get template component by ID.
 * Falls back to EnvelopeReveal if template not found or not implemented.
 */
export function getTemplateComponent(
  templateId: TemplateId | string
): ComponentType<InvitationTemplateProps> {
  const template = templateRegistry[templateId as TemplateId];

  if (!template) {
    console.warn(
      `Template "${templateId}" not available, falling back to ENVELOPE_REVEAL`
    );
    return EnvelopeReveal;
  }

  return template;
}

/**
 * Check if a template is available
 */
export function isTemplateAvailable(templateId: TemplateId | string): boolean {
  return templateRegistry[templateId as TemplateId] !== null;
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplates(): TemplateId[] {
  return (Object.keys(templateRegistry) as TemplateId[]).filter(
    (id) => templateRegistry[id] !== null
  );
}
