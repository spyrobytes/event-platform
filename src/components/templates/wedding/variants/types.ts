/**
 * Wedding Template Variant Configuration Types
 *
 * Each variant is defined by configuration, not code.
 * This enables 17+ variants with a single template engine.
 */

export type VariantCategory = "core" | "cultural" | "seasonal" | "specialized";

export type AnimationLevel = "none" | "subtle" | "moderate";

export type CustomizationLevel = "locked" | "curated" | "flexible";

/**
 * Style tokens for visual theming
 */
export type StyleTokens = {
  /** Font family for headings (CSS font-family value) */
  fontHeading: string;
  /** Font family for body text (CSS font-family value) */
  fontBody: string;
  /** Named color palette identifier */
  colorPalette: string;
  /** Primary accent color (hex) */
  accentColor: string;
  /** Optional background pattern/texture */
  backgroundPattern?: string;
  /** Optional decorative elements style */
  decorativeStyle?: "none" | "floral" | "geometric" | "organic" | "elegant";
};

/**
 * Section configuration within a variant
 */
export type VariantSectionConfig = {
  /** Section type identifier */
  type: string;
  /** Whether this section is enabled by default */
  enabled: boolean;
  /** Display order (lower = earlier) */
  order: number;
  /** Default content for this section */
  defaultContent?: Record<string, unknown>;
  /** Whether user can disable this section */
  canDisable?: boolean;
  /** Custom heading for this variant */
  customHeading?: string;
};

/**
 * Feature flags for variant-specific behaviors
 */
export type FeatureFlags = {
  /** Support multi-day event schedules */
  multiDaySchedule?: boolean;
  /** Include cultural traditions section */
  culturalTraditions?: boolean;
  /** Enable bilingual content fields */
  bilingual?: boolean;
  /** Show wedding party section */
  weddingParty?: boolean;
  /** Include attire guidance section */
  attire?: boolean;
  /** Show livestream option */
  livestream?: boolean;
  /** Enable registry links */
  registry?: boolean;
};

/**
 * Mobile-specific optimizations
 */
export type MobileOptimizations = {
  /** Stack sections vertically on mobile */
  stackingSections: boolean;
  /** Enable touch gestures (swipe gallery, etc.) */
  touchGestures: boolean;
  /** Reduce animations on mobile */
  reducedMotion: boolean;
};

/**
 * SEO defaults for the variant
 */
export type SEODefaults = {
  /** Title template (use {names} for couple names) */
  titleTemplate: string;
  /** Description template */
  descriptionTemplate: string;
  /** OG image style identifier */
  ogImageStyle: string;
};

/**
 * Complete Wedding Variant Configuration
 *
 * This is the authoritative type for all wedding variants.
 * Each variant differs only by these configuration values.
 */
export type WeddingVariantConfig = {
  /** Unique identifier (e.g., "classic", "modern_minimal") */
  id: string;
  /** Display name for UI */
  displayName: string;
  /** Short description */
  description: string;
  /** Variant category */
  category: VariantCategory;
  /** "Best for" tags for matching */
  bestFor: string[];
  /** Preview thumbnail path */
  thumbnail?: string;

  /** Visual styling tokens */
  styleTokens: StyleTokens;

  /** Section configuration */
  sections: VariantSectionConfig[];

  /** Feature toggles */
  featureFlags: FeatureFlags;

  /** Animation intensity */
  animations: AnimationLevel;

  /** Mobile optimizations */
  mobileOptimizations: MobileOptimizations;

  /** SEO defaults */
  seoDefaults: SEODefaults;

  /** How much customization users can do */
  customizationLevel: CustomizationLevel;
};

/**
 * Variant registry type
 */
export type WeddingVariantRegistry = Record<string, WeddingVariantConfig>;

/**
 * Get section order for a variant
 */
export function getSectionOrder(
  variant: WeddingVariantConfig,
  sectionType: string
): number {
  const section = variant.sections.find((s) => s.type === sectionType);
  return section?.order ?? 999;
}

/**
 * Check if a section is enabled by default in a variant
 */
export function isSectionEnabledByDefault(
  variant: WeddingVariantConfig,
  sectionType: string
): boolean {
  const section = variant.sections.find((s) => s.type === sectionType);
  return section?.enabled ?? false;
}

/**
 * Get enabled sections for a variant, sorted by order
 */
export function getEnabledSections(
  variant: WeddingVariantConfig
): VariantSectionConfig[] {
  return variant.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);
}
