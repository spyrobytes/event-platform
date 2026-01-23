/**
 * Core Wedding Variants
 *
 * The foundational 5 variants covering most common wedding styles.
 */

export { classicVariant } from "./classic";
export { modernMinimalVariant } from "./modern-minimal";
export { rusticOutdoorVariant } from "./rustic-outdoor";
export { destinationVariant } from "./destination";
export { intimateMicroVariant } from "./intimate-micro";

import { classicVariant } from "./classic";
import { modernMinimalVariant } from "./modern-minimal";
import { rusticOutdoorVariant } from "./rustic-outdoor";
import { destinationVariant } from "./destination";
import { intimateMicroVariant } from "./intimate-micro";
import type { WeddingVariantConfig } from "../types";

/**
 * All core variants as a record
 */
export const CORE_VARIANTS: Record<string, WeddingVariantConfig> = {
  classic: classicVariant,
  modern_minimal: modernMinimalVariant,
  rustic_outdoor: rusticOutdoorVariant,
  destination: destinationVariant,
  intimate_micro: intimateMicroVariant,
};

/**
 * Core variant IDs
 */
export const CORE_VARIANT_IDS = Object.keys(CORE_VARIANTS);
