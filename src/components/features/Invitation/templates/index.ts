export { EnvelopeReveal } from "./EnvelopeReveal";
export { EnvelopeRevealV2, InvitationContent } from "./EnvelopeRevealV2";
export { LayeredUnfold } from "./LayeredUnfold";
export { CinematicScroll } from "./CinematicScroll";
export { TimeBasedReveal } from "./TimeBasedReveal";
export { SplitRevealCard } from "./SplitRevealCard";

import type { ComponentType, ReactNode } from "react";
import type { InvitationState } from "@/hooks";
import type { InvitationData } from "@/schemas/invitation";
import { EnvelopeReveal } from "./EnvelopeReveal";
import { EnvelopeRevealV2 } from "./EnvelopeRevealV2";
import { LayeredUnfold } from "./LayeredUnfold";
import { CinematicScroll } from "./CinematicScroll";
import { TimeBasedReveal } from "./TimeBasedReveal";
import { SplitRevealCard } from "./SplitRevealCard";

/**
 * Common props shared by wrapper-style templates (children-based)
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
 * Props for data-driven templates (render their own content)
 */
export type DataDrivenTemplateProps = {
  data: InvitationData;
  autoOpen?: boolean;
  initialState?: InvitationState;
  onStateChange?: (state: InvitationState) => void;
  showReplay?: boolean;
  showHint?: boolean;
  className?: string;
};

/**
 * Template ID type (matches Prisma enum)
 */
export type TemplateId =
  | "ENVELOPE_REVEAL"
  | "ENVELOPE_REVEAL_V2"
  | "SPLIT_REVEAL"
  | "LAYERED_UNFOLD"
  | "CINEMATIC_SCROLL"
  | "TIME_BASED_REVEAL";

/**
 * Template type classification
 */
export type TemplateType = "wrapper" | "data-driven";

/**
 * Registry of available invitation templates
 * Note: Templates have different prop interfaces based on their type
 * - wrapper: Takes children (e.g., EnvelopeReveal wraps InvitationCard)
 * - data-driven: Takes data directly (e.g., LayeredUnfold renders its own layers)
 */
const templateRegistry: Record<
  TemplateId,
  {
    component: ComponentType<InvitationTemplateProps> | ComponentType<DataDrivenTemplateProps> | null;
    type: TemplateType;
  }
> = {
  ENVELOPE_REVEAL: { component: EnvelopeReveal, type: "wrapper" },
  ENVELOPE_REVEAL_V2: { component: EnvelopeRevealV2 as ComponentType<InvitationTemplateProps>, type: "wrapper" },
  SPLIT_REVEAL: { component: SplitRevealCard, type: "data-driven" },
  LAYERED_UNFOLD: { component: LayeredUnfold, type: "data-driven" },
  CINEMATIC_SCROLL: { component: CinematicScroll, type: "data-driven" },
  TIME_BASED_REVEAL: { component: TimeBasedReveal, type: "data-driven" },
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
    type: TemplateType;
  }
> = {
  ENVELOPE_REVEAL: {
    name: "Envelope Reveal",
    description: "Classic envelope opening animation",
    available: true,
    type: "wrapper",
  },
  ENVELOPE_REVEAL_V2: {
    name: "Envelope Reveal V2",
    description: "Premium envelope with self-contained themes",
    available: true,
    type: "wrapper",
  },
  SPLIT_REVEAL: {
    name: "Split Reveal",
    description: "Dramatic split-door with wax seal",
    available: true,
    type: "data-driven",
  },
  LAYERED_UNFOLD: {
    name: "Layered Unfold",
    description: "Modern card unfolding sequence",
    available: true,
    type: "data-driven",
  },
  CINEMATIC_SCROLL: {
    name: "Cinematic Scroll",
    description: "Story-driven scroll experience",
    available: true,
    type: "data-driven",
  },
  TIME_BASED_REVEAL: {
    name: "Time-Based Reveal",
    description: "Dramatic auto-playing presentation",
    available: true,
    type: "data-driven",
  },
};

/**
 * Get template component by ID.
 * Falls back to EnvelopeReveal if template not found or not implemented.
 */
export function getTemplateComponent(
  templateId: TemplateId | string
): ComponentType<InvitationTemplateProps> {
  const entry = templateRegistry[templateId as TemplateId];

  if (!entry?.component || entry.type !== "wrapper") {
    console.warn(
      `Template "${templateId}" not available as wrapper, falling back to ENVELOPE_REVEAL`
    );
    return EnvelopeReveal;
  }

  return entry.component as ComponentType<InvitationTemplateProps>;
}

/**
 * Get data-driven template component by ID.
 * Returns null if template is not available or is a wrapper type.
 */
export function getDataDrivenTemplateComponent(
  templateId: TemplateId | string
): ComponentType<DataDrivenTemplateProps> | null {
  const entry = templateRegistry[templateId as TemplateId];

  if (!entry?.component || entry.type !== "data-driven") {
    return null;
  }

  return entry.component as ComponentType<DataDrivenTemplateProps>;
}

/**
 * Get template type
 */
export function getTemplateType(templateId: TemplateId | string): TemplateType {
  return templateRegistry[templateId as TemplateId]?.type ?? "wrapper";
}

/**
 * Check if a template is available
 */
export function isTemplateAvailable(templateId: TemplateId | string): boolean {
  return templateRegistry[templateId as TemplateId]?.component !== null;
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplates(): TemplateId[] {
  return (Object.keys(templateRegistry) as TemplateId[]).filter(
    (id) => templateRegistry[id].component !== null
  );
}
