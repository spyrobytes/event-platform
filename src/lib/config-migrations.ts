import {
  eventPageConfigV1Schema,
  type EventPageConfigV1,
} from "@/schemas/event-page";

// =============================================================================
// CONFIG VERSION MIGRATIONS
// =============================================================================

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Type for unknown/unversioned config
 */
type UnknownConfig = Record<string, unknown>;

/**
 * Migrates a page config to the latest schema version
 * Throws if config cannot be migrated
 */
export function migratePageConfig(config: UnknownConfig): EventPageConfigV1 {
  const version = (config.schemaVersion as number) || 1;

  switch (version) {
    case 1:
      // Already at latest version
      return config as unknown as EventPageConfigV1;

    // Future versions would be handled here:
    // case 2:
    //   return migrateV2toV1(config);

    default:
      throw new Error(`Unsupported config version: ${version}`);
  }
}

/**
 * Validates and migrates a config to the latest version
 * Combines migration with Zod validation
 */
export function validateAndMigrate(config: unknown): EventPageConfigV1 {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid config: must be an object");
  }

  const migrated = migratePageConfig(config as UnknownConfig);
  return eventPageConfigV1Schema.parse(migrated);
}

/**
 * Safely validates and migrates, returning error instead of throwing
 */
export function safeValidateAndMigrate(
  config: unknown
): { success: true; data: EventPageConfigV1 } | { success: false; error: string } {
  try {
    const result = validateAndMigrate(config);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validation error";
    return { success: false, error: message };
  }
}

// =============================================================================
// DEFAULT CONFIG BUILDERS
// =============================================================================

/**
 * Creates a default page config from a template's defaults
 * Merges template defaults with event-specific overrides
 */
export function createDefaultConfig(
  templateDefaults: UnknownConfig,
  overrides?: Partial<EventPageConfigV1>
): EventPageConfigV1 {
  const baseConfig = migratePageConfig(templateDefaults);

  if (!overrides) {
    return baseConfig;
  }

  // Deep merge overrides
  return {
    schemaVersion: 1,
    theme: {
      ...baseConfig.theme,
      ...overrides.theme,
    },
    hero: {
      ...baseConfig.hero,
      ...overrides.hero,
    },
    sections: overrides.sections ?? baseConfig.sections,
  };
}

/**
 * Creates a minimal valid config for a new event
 */
export function createMinimalConfig(
  title: string,
  options?: {
    subtitle?: string;
    preset?: "classic" | "modern" | "romantic";
    primaryColor?: string;
  }
): EventPageConfigV1 {
  return {
    schemaVersion: 1,
    theme: {
      preset: options?.preset ?? "modern",
      primaryColor: options?.primaryColor ?? "#2563EB",
      fontPair: "modern",
    },
    hero: {
      title,
      subtitle: options?.subtitle,
      align: "center",
      overlay: "soft",
    },
    sections: [],
  };
}

// =============================================================================
// CONFIG DIFF UTILITIES
// =============================================================================

/**
 * Compares two configs and returns whether they differ
 * Used to determine if a new version should be saved
 */
export function configsAreDifferent(
  config1: EventPageConfigV1,
  config2: EventPageConfigV1
): boolean {
  return JSON.stringify(config1) !== JSON.stringify(config2);
}

/**
 * Gets a summary of changes between two configs
 * Useful for version history UI
 */
export function getConfigChangeSummary(
  oldConfig: EventPageConfigV1,
  newConfig: EventPageConfigV1
): string[] {
  const changes: string[] = [];

  // Check theme changes
  if (oldConfig.theme.preset !== newConfig.theme.preset) {
    changes.push(`Theme preset changed to ${newConfig.theme.preset}`);
  }
  if (oldConfig.theme.primaryColor !== newConfig.theme.primaryColor) {
    changes.push(`Primary color changed to ${newConfig.theme.primaryColor}`);
  }
  if (oldConfig.theme.fontPair !== newConfig.theme.fontPair) {
    changes.push(`Font pair changed to ${newConfig.theme.fontPair}`);
  }

  // Check hero changes
  if (oldConfig.hero.title !== newConfig.hero.title) {
    changes.push("Hero title updated");
  }
  if (oldConfig.hero.subtitle !== newConfig.hero.subtitle) {
    changes.push("Hero subtitle updated");
  }
  if (oldConfig.hero.heroImageAssetId !== newConfig.hero.heroImageAssetId) {
    changes.push("Hero image changed");
  }

  // Check section changes
  const oldSectionCount = oldConfig.sections.length;
  const newSectionCount = newConfig.sections.length;
  if (oldSectionCount !== newSectionCount) {
    if (newSectionCount > oldSectionCount) {
      changes.push(`${newSectionCount - oldSectionCount} section(s) added`);
    } else {
      changes.push(`${oldSectionCount - newSectionCount} section(s) removed`);
    }
  }

  // Check section content changes
  const minLength = Math.min(oldSectionCount, newSectionCount);
  for (let i = 0; i < minLength; i++) {
    const oldSection = oldConfig.sections[i];
    const newSection = newConfig.sections[i];
    if (JSON.stringify(oldSection) !== JSON.stringify(newSection)) {
      changes.push(`Section "${newSection.type}" updated`);
    }
  }

  return changes.length > 0 ? changes : ["No changes detected"];
}

// =============================================================================
// VERSION HISTORY HELPERS
// =============================================================================

/**
 * Maximum number of versions to keep per event
 */
export const MAX_VERSIONS_PER_EVENT = 10;

/**
 * Determines if a config change is significant enough to save a version
 * Minor changes (like whitespace) don't warrant a new version
 */
export function shouldSaveVersion(
  oldConfig: EventPageConfigV1 | null,
  newConfig: EventPageConfigV1
): boolean {
  if (!oldConfig) {
    return true; // Always save first version
  }

  return configsAreDifferent(oldConfig, newConfig);
}
