/**
 * Wedding V3 Template System
 *
 * Factory-based template architecture where each template is defined as a
 * TemplateDefinition (pure data) and rendered via createWeddingTemplate().
 */

export { createWeddingTemplate } from "./createWeddingTemplate";
export type {
  V3TemplateId,
  TemplateDefinition,
  ThemePack,
  MotionPreset,
  CuratedSwatch,
  ChromeKit,
} from "./types";

// Template definitions
export { EDITORIAL } from "./definitions/editorial";
export { INTIMATE_NOTE } from "./definitions/intimate-note";
export { FINE_ART } from "./definitions/fine-art";
export { GARDEN_HOUSE } from "./definitions/garden-house";
export { GRAND_LUXE } from "./definitions/grand-luxe";
export { CELEBRATION } from "./definitions/celebration";

// ---------------------------------------------------------------------------
// V3 definition lookup by platform templateId
// ---------------------------------------------------------------------------

import type { TemplateDefinition } from "./types";
import { EDITORIAL } from "./definitions/editorial";
import { INTIMATE_NOTE } from "./definitions/intimate-note";
import { FINE_ART } from "./definitions/fine-art";
import { GARDEN_HOUSE } from "./definitions/garden-house";
import { GRAND_LUXE } from "./definitions/grand-luxe";
import { CELEBRATION } from "./definitions/celebration";

const V3_DEFINITIONS: Record<string, TemplateDefinition> = {
  wedding_editorial: EDITORIAL,
  wedding_intimate_note: INTIMATE_NOTE,
  wedding_fine_art: FINE_ART,
  wedding_garden_house: GARDEN_HOUSE,
  wedding_grand_luxe: GRAND_LUXE,
  wedding_celebration: CELEBRATION,
};

/**
 * Get a V3 template definition by platform templateId.
 * Returns undefined if not a V3 template.
 */
export function getV3Definition(templateId: string): TemplateDefinition | undefined {
  return V3_DEFINITIONS[templateId];
}
