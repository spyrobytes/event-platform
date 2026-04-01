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
