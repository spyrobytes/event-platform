import type { ZodError } from "zod";
import {
  eventPageConfigV1Schema,
  sectionSchema,
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
 * Narrows to a plain object. Unlike `typeof x === "object"`, this rejects arrays
 * and null — a stored config must be a keyed record, never a JSON array.
 */
function isRecord(value: unknown): value is UnknownConfig {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Backfills `formattedAddress` on map sections from the legacy `address` field.
 * Pre-Phase-2 configs stored the venue address as `data.address`; the canonical
 * Phase 2+ field is `data.formattedAddress`. Both remain in the schema so saved
 * configs continue to validate; this normalizer ensures any consumer that reads
 * `formattedAddress` sees a value when only the legacy field was set.
 * Idempotent — sections that already carry `formattedAddress` pass through.
 */
function normalizeMapSections(config: UnknownConfig): UnknownConfig {
  const sections = config.sections;
  if (!Array.isArray(sections)) return config;

  let mutated = false;
  const newSections = sections.map((section) => {
    if (
      !section ||
      typeof section !== "object" ||
      (section as { type?: unknown }).type !== "map"
    ) {
      return section;
    }
    const data = (section as { data?: { address?: unknown; formattedAddress?: unknown } }).data;
    if (!data) return section;

    const hasFormatted = typeof data.formattedAddress === "string" && data.formattedAddress.length > 0;
    const hasLegacy = typeof data.address === "string" && data.address.length > 0;
    if (hasFormatted || !hasLegacy) return section;

    mutated = true;
    return {
      ...(section as object),
      data: { ...data, formattedAddress: data.address },
    };
  });

  if (!mutated) return config;
  return { ...config, sections: newSections };
}

/**
 * Backfills stable ids on registry items that lack one. Registry items were
 * originally indexed by array position; Phase 2 guest claims need an id that
 * survives reorders/edits. Assignment is idempotent — items with an existing
 * id pass through unchanged. The new id persists on the next save.
 */
function backfillRegistryItemIds(config: UnknownConfig): UnknownConfig {
  const sections = config.sections;
  if (!Array.isArray(sections)) return config;

  let mutated = false;
  const newSections = sections.map((section) => {
    if (
      !section ||
      typeof section !== "object" ||
      (section as { type?: unknown }).type !== "registry"
    ) {
      return section;
    }
    const data = (section as { data?: { items?: unknown } }).data;
    const items = data?.items;
    if (!Array.isArray(items)) return section;

    let sectionMutated = false;
    const newItems = items.map((item) => {
      if (!item || typeof item !== "object") return item;
      const existingId = (item as { id?: unknown }).id;
      if (typeof existingId === "string" && existingId.length > 0) return item;
      sectionMutated = true;
      mutated = true;
      return { ...(item as object), id: crypto.randomUUID() };
    });

    if (!sectionMutated) return section;
    return { ...(section as object), data: { ...data, items: newItems } };
  });

  if (!mutated) return config;
  return { ...config, sections: newSections };
}

/**
 * Migrates a page config to the latest schema version
 * Throws if config cannot be migrated
 */
export function migratePageConfig(config: UnknownConfig): EventPageConfigV1 {
  const version = (config.schemaVersion as number) || 1;

  switch (version) {
    case 1: {
      // Already at latest version. Run idempotent structural backfills that
      // don't warrant a version bump (e.g. stable ids on JSON array items,
      // map section formattedAddress migration).
      let backfilled = backfillRegistryItemIds(config);
      backfilled = normalizeMapSections(backfilled);
      return backfilled as unknown as EventPageConfigV1;
    }

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
  if (!isRecord(config)) {
    throw new Error("Invalid config: must be a plain object");
  }

  const migrated = migratePageConfig(config);
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
// LENIENT (SECTION-LEVEL) PARSE
// =============================================================================

/**
 * A section that could not be parsed against the running branch's schema and
 * was therefore skipped from the rendered config. Surfaced to the editor so it
 * can show a non-blocking banner; the section's data is NOT lost (it stays in
 * the stored row and re-merges on save).
 */
export type DroppedSection = {
  /** Original position of the section in the stored `sections` array. */
  index: number;
  /** The section's `type` value, surfaced for the editor banner label. May be
   *  anything (including undefined) when the stored section is malformed. */
  type: unknown;
  /** Concise reason the section failed to parse. */
  reason: string;
};

export type LenientConfigResult = {
  config: EventPageConfigV1;
  dropped: DroppedSection[];
};

/** First-issue summary of a Zod error, bounded for display. */
function summarizeZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "invalid section";
  const path = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
  const msg = `${path}${first.message}`;
  return msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
}

/**
 * Like {@link validateAndMigrate}, but tolerant at the section level. `theme`,
 * `hero`, and all top-level fields stay STRICT — an invalid theme still throws,
 * so callers fall back exactly as before. The `sections` array is validated
 * element-by-element: valid sections are kept, invalid ones are dropped and
 * reported in `dropped`.
 *
 * This is the read-path defense against a single stale/unknown section (e.g. an
 * enum value absent from the running branch's schema) blanking the entire page.
 * Used by the public loader, the preview page, and the editor GET handler.
 */
export function lenientValidateAndMigrate(config: unknown): LenientConfigResult {
  if (!isRecord(config)) {
    throw new Error("Invalid config: must be a plain object");
  }

  const migrated = migratePageConfig(config) as unknown as UnknownConfig;
  const rawSections = Array.isArray(migrated.sections) ? migrated.sections : [];

  const kept: unknown[] = [];
  const dropped: DroppedSection[] = [];

  rawSections.forEach((section, index) => {
    const result = sectionSchema.safeParse(section);
    if (result.success) {
      kept.push(result.data);
      return;
    }
    const type =
      section && typeof section === "object"
        ? (section as { type?: unknown }).type
        : undefined;
    dropped.push({ index, type, reason: summarizeZodError(result.error) });
  });

  // Re-validate the whole config with only the kept (already-valid) sections.
  // Enforces strict theme/hero and applies top-level defaults; cannot fail on
  // sections since each already passed sectionSchema.
  const validated = eventPageConfigV1Schema.parse({ ...migrated, sections: kept });
  return { config: validated, dropped };
}

/**
 * Deep "subset" check: true when every leaf present in `subset` is also present,
 * with an equal value, in `superset`. `superset` MAY carry extra keys. Arrays
 * must match in length and be element-wise subsets (our migrations never reorder
 * or resize arrays without also dropping a section, which is gated separately).
 */
export function isDeepSubset(subset: unknown, superset: unknown): boolean {
  if (subset === superset) return true;
  if (
    subset === null ||
    superset === null ||
    typeof subset !== "object" ||
    typeof superset !== "object"
  ) {
    return subset === superset;
  }

  if (Array.isArray(subset) || Array.isArray(superset)) {
    if (!Array.isArray(subset) || !Array.isArray(superset)) return false;
    if (subset.length !== superset.length) return false;
    return subset.every((el, i) => isDeepSubset(el, superset[i]));
  }

  const sub = subset as UnknownConfig;
  const sup = superset as UnknownConfig;
  return Object.keys(sub).every(
    (key) => key in sup && isDeepSubset(sub[key], sup[key])
  );
}

/**
 * Read-time auto-persist gate. Both page loaders write a migrated config back to
 * the row when it differs from stored, to bake in idempotent backfills (registry
 * uuids, map `formattedAddress`). Three conditions must hold:
 *
 * 1. Something changed (else the write is a no-op).
 * 2. No section was dropped — a transient schema skew must never strip the
 *    organizer's sections on a mere read.
 * 3. The migration is purely ADDITIVE — the migrated config deep-contains the
 *    stored one. An older branch's Zod parse silently strips unknown optional
 *    fields (we evolve by adding `.optional()` fields at schemaVersion 1); if we
 *    persisted that, the newer field would be erased. Skipping the write leaves
 *    it in storage, hidden until the schema understands it again — same self-heal
 *    guarantee the section-level lenient parse gives.
 */
export function shouldPersistMigratedConfig(
  rawConfig: unknown,
  migratedConfig: EventPageConfigV1,
  droppedCount: number
): boolean {
  if (droppedCount > 0) return false;
  const changed = JSON.stringify(rawConfig) !== JSON.stringify(migratedConfig);
  if (!changed) return false;
  return isDeepSubset(rawConfig, migratedConfig);
}

export type MergePreservedResult =
  | { ok: true; merged: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Re-merge server-trusted preserved sections into a freshly-validated config on
 * save. Preserved sections are the ones the running schema cannot parse — their
 * CONTENT is taken from `storedRawConfig` (never the client) so a save can't
 * inject invalid JSON or strip a quarantined section. `removedIndices` are the
 * original stored indices the organizer chose to drop permanently.
 *
 * Preserved sections are appended after the validated sections; their on-page
 * position only matters once the schema understands them again, at which point
 * the organizer can reorder. Enforces the 12-section ceiling on the merged total.
 */
export function mergePreservedSections(args: {
  validatedConfig: EventPageConfigV1;
  storedRawConfig: unknown;
  removedIndices?: number[];
}): MergePreservedResult {
  const { validatedConfig, storedRawConfig, removedIndices = [] } = args;

  // Derive preserved sections from the stored row, leniently. Their content is
  // whatever the running schema cannot parse — taken verbatim from storage.
  let preserved: Array<{ index: number; raw: unknown }> = [];
  if (storedRawConfig && typeof storedRawConfig === "object") {
    let migrated: UnknownConfig;
    try {
      migrated = migratePageConfig(storedRawConfig as UnknownConfig) as unknown as UnknownConfig;
    } catch {
      migrated = storedRawConfig as UnknownConfig;
    }
    const rawSections = Array.isArray(migrated.sections) ? migrated.sections : [];
    rawSections.forEach((section, index) => {
      if (!sectionSchema.safeParse(section).success) {
        preserved.push({ index, raw: section });
      }
    });
  }

  const removeSet = new Set(removedIndices);
  preserved = preserved.filter((p) => !removeSet.has(p.index));

  const mergedSections = [
    ...validatedConfig.sections,
    ...preserved.map((p) => p.raw),
  ];

  if (mergedSections.length > 12) {
    return {
      ok: false,
      error: `Maximum 12 sections allowed (${validatedConfig.sections.length} editable + ${preserved.length} preserved).`,
    };
  }

  return {
    ok: true,
    merged: { ...validatedConfig, sections: mergedSections },
  };
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
