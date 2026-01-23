/**
 * Wedding Template Variant Registry
 *
 * Central registry for all wedding variants.
 * Currently includes 5 core variants. Cultural, seasonal, and
 * specialized variants will be added as the platform matures.
 */

export * from "./types";
export * from "./core";

import { CORE_VARIANTS, CORE_VARIANT_IDS } from "./core";
import type { WeddingVariantConfig, WeddingVariantRegistry } from "./types";

/**
 * Complete variant registry
 *
 * As new variant categories are added, they will be merged here:
 * - CORE_VARIANTS (5) - Available now
 * - CULTURAL_VARIANTS (4) - Future
 * - SEASONAL_VARIANTS (4) - Future
 * - SPECIALIZED_VARIANTS (4) - Future
 */
export const WEDDING_VARIANTS: WeddingVariantRegistry = {
  ...CORE_VARIANTS,
};

/**
 * Default variant ID when none specified
 */
export const DEFAULT_VARIANT_ID = "classic";

/**
 * Get a variant by ID, falling back to classic if not found
 */
export function getWeddingVariant(variantId: string): WeddingVariantConfig {
  return WEDDING_VARIANTS[variantId] || WEDDING_VARIANTS[DEFAULT_VARIANT_ID];
}

/**
 * Check if a variant exists
 */
export function variantExists(variantId: string): boolean {
  return variantId in WEDDING_VARIANTS;
}

/**
 * Get all available variant IDs
 */
export function getAvailableVariantIds(): string[] {
  return Object.keys(WEDDING_VARIANTS);
}

/**
 * Get variants by category
 */
export function getVariantsByCategory(
  category: WeddingVariantConfig["category"]
): WeddingVariantConfig[] {
  return Object.values(WEDDING_VARIANTS).filter((v) => v.category === category);
}

/**
 * Get variant display info for UI (picker, previews, etc.)
 */
export type VariantDisplayInfo = {
  id: string;
  displayName: string;
  description: string;
  category: string;
  bestFor: string[];
  thumbnail?: string;
  accentColor: string;
};

export function getVariantDisplayInfo(variantId: string): VariantDisplayInfo {
  const variant = getWeddingVariant(variantId);
  return {
    id: variant.id,
    displayName: variant.displayName,
    description: variant.description,
    category: variant.category,
    bestFor: variant.bestFor,
    thumbnail: variant.thumbnail,
    accentColor: variant.styleTokens.accentColor,
  };
}

/**
 * Get all variants as display info for the picker UI
 */
export function getAllVariantsDisplayInfo(): VariantDisplayInfo[] {
  return Object.keys(WEDDING_VARIANTS).map(getVariantDisplayInfo);
}

/**
 * Variant IDs grouped by category for UI organization
 */
export const VARIANT_IDS_BY_CATEGORY = {
  core: CORE_VARIANT_IDS,
  // Future categories:
  // cultural: CULTURAL_VARIANT_IDS,
  // seasonal: SEASONAL_VARIANT_IDS,
  // specialized: SPECIALIZED_VARIANT_IDS,
};
