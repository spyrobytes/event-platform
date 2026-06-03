import { describe, it, expect } from "vitest";
import {
  migratePageConfig,
  validateAndMigrate,
  lenientValidateAndMigrate,
  shouldPersistMigratedConfig,
  mergePreservedSections,
  getPreservedRegistryItemIds,
  isDeepSubset,
} from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";

describe("migratePageConfig — map section normalization", () => {
  it("copies legacy address → formattedAddress when latter is unset", () => {
    const config = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            address: "100 King St W, Toronto",
            latitude: 43.6481,
            longitude: -79.3829,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    const migrated = migratePageConfig(config) as unknown as {
      sections: Array<{ data: { address?: string; formattedAddress?: string } }>;
    };

    expect(migrated.sections[0].data.formattedAddress).toBe("100 King St W, Toronto");
    // Legacy field preserved — keeps old serialized configs valid.
    expect(migrated.sections[0].data.address).toBe("100 King St W, Toronto");
  });

  it("does not overwrite an existing formattedAddress", () => {
    const config = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            address: "Old address",
            formattedAddress: "New formatted address",
            latitude: 43.6481,
            longitude: -79.3829,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    const migrated = migratePageConfig(config) as unknown as {
      sections: Array<{ data: { address?: string; formattedAddress?: string } }>;
    };

    expect(migrated.sections[0].data.formattedAddress).toBe("New formatted address");
    expect(migrated.sections[0].data.address).toBe("Old address");
  });

  it("is idempotent — running twice produces the same result", () => {
    const config = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            address: "100 King St W",
            latitude: 43.6481,
            longitude: -79.3829,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    const once = migratePageConfig(config);
    const twice = migratePageConfig(once as unknown as Record<string, unknown>);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it("leaves sections without legacy address untouched", () => {
    const config = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    const migrated = migratePageConfig(config) as unknown as {
      sections: Array<{ data: { address?: string; formattedAddress?: string } }>;
    };

    expect(migrated.sections[0].data.formattedAddress).toBeUndefined();
    expect(migrated.sections[0].data.address).toBeUndefined();
  });

  it("does not touch non-map sections", () => {
    const config = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "rsvp",
          enabled: true,
          data: { heading: "RSVP", showMaybeOption: true, allowPlusOnes: false, maxPlusOnes: 0 },
        },
      ],
    };

    const migrated = migratePageConfig(config) as unknown as {
      sections: Array<{ type: string; data: Record<string, unknown> }>;
    };
    expect(migrated.sections[0].type).toBe("rsvp");
    // No surprise fields added.
    expect(migrated.sections[0].data.formattedAddress).toBeUndefined();
  });

  it("produces a Zod-valid config that survives validateAndMigrate", () => {
    const legacy = {
      schemaVersion: 1,
      theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
      hero: { title: "Test", align: "center", overlay: "soft" },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            address: "100 King St W, Toronto",
            latitude: 43.6481,
            longitude: -79.3829,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    // Should not throw.
    const result = validateAndMigrate(legacy);
    expect(result).toBeDefined();
  });
});

// =============================================================================
// LENIENT (SECTION-LEVEL) PARSE
// =============================================================================

const validFaq = {
  type: "faq",
  enabled: true,
  data: { items: [{ q: "When?", a: "At noon." }] },
};

const validWeddingParty = {
  type: "weddingParty",
  enabled: true,
  data: { members: [{ name: "Alex", role: "Best Man" }] },
};

// Invalid: displayStyle is not in the enum (mirrors the Jack & Xena incident
// where a stored enum value wasn't known to the running branch's schema).
const invalidWeddingParty = {
  type: "weddingParty",
  enabled: true,
  data: {
    members: [{ name: "Alex", role: "Best Man" }],
    displayStyle: "nonexistent_style",
  },
};

// Invalid: unknown discriminator — no member of the section union matches.
const unknownSection = { type: "frobnicate", enabled: true, data: {} };

function makeConfig(sections: unknown[]) {
  return {
    schemaVersion: 1,
    theme: { preset: "modern", primaryColor: "#000000", fontPair: "modern" },
    hero: { title: "Test", align: "center", overlay: "soft" },
    sections,
  };
}

describe("lenientValidateAndMigrate", () => {
  it("keeps valid sections and drops an invalid one with index/type/reason", () => {
    const { config, dropped } = lenientValidateAndMigrate(
      makeConfig([validFaq, invalidWeddingParty, validWeddingParty])
    );

    expect(config.sections.map((s) => s.type)).toEqual(["faq", "weddingParty"]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].index).toBe(1);
    expect(dropped[0].type).toBe("weddingParty");
    expect(dropped[0].reason).toBeTruthy();
  });

  it("drops a section with an unknown type instead of throwing", () => {
    const { config, dropped } = lenientValidateAndMigrate(
      makeConfig([validFaq, unknownSection])
    );

    expect(config.sections).toHaveLength(1);
    expect(config.sections[0].type).toBe("faq");
    expect(dropped).toHaveLength(1);
    expect(dropped[0].type).toBe("frobnicate");
  });

  it("is byte-identical to strict validateAndMigrate for a fully-valid config", () => {
    const { config, dropped } = lenientValidateAndMigrate(
      makeConfig([validFaq, validWeddingParty])
    );

    expect(dropped).toHaveLength(0);
    expect(config).toEqual(validateAndMigrate(makeConfig([validFaq, validWeddingParty])));
  });

  it("salvages an invalid theme field to a default, keeping valid fields + sections", () => {
    const bad = makeConfig([validFaq]);
    bad.theme.preset = "not_a_preset"; // unknown enum on this branch
    bad.theme.primaryColor = "#FF0000"; // valid — must survive
    const { config, dropped } = lenientValidateAndMigrate(bad);

    expect(config.theme.preset).toBe("modern"); // bad field reset to default
    expect(config.theme.primaryColor).toBe("#FF0000"); // organizer's color kept
    expect(config.sections).toHaveLength(1); // not blanked
    expect(dropped).toHaveLength(0);
  });

  it("salvages an invalid hero field while keeping the title", () => {
    const bad = makeConfig([validFaq]);
    bad.hero.align = "diagonal"; // unknown enum
    bad.hero.title = "Real Title";
    const { config } = lenientValidateAndMigrate(bad);

    expect(config.hero.title).toBe("Real Title");
    expect(config.hero.align).toBe("center"); // defaulted
    expect(config.sections).toHaveLength(1);
  });

  it("falls back to the default theme when theme is not even an object", () => {
    const bad = makeConfig([validFaq]) as Record<string, unknown>;
    bad.theme = "purple";
    const { config } = lenientValidateAndMigrate(bad as never);

    expect((config.theme as { preset: string }).preset).toBe("modern");
    expect((config.theme as { primaryColor: string }).primaryColor).toBe("#2563EB");
    expect(config.sections).toHaveLength(1);
  });

  it("drops an invalid optional top-level field instead of blanking", () => {
    const bad = makeConfig([validFaq]) as Record<string, unknown>;
    // Bad platform enum + bad url — the whole socialLinks array fails strict.
    bad.socialLinks = [{ platform: "myspace", url: "not-a-url" }];
    const { config } = lenientValidateAndMigrate(bad as never);

    expect((config as { socialLinks?: unknown }).socialLinks).toBeUndefined();
    expect(config.sections).toHaveLength(1);
  });

  it("keeps more than 12 valid sections without throwing (no .max blank-out)", () => {
    // A future cap bump could persist >12 valid sections; an older branch must
    // render them, not throw on .max and blank the whole page.
    const many = Array.from({ length: 14 }, () => ({ ...validFaq }));
    const { config, dropped } = lenientValidateAndMigrate(makeConfig(many));
    expect(config.sections).toHaveLength(14);
    expect(dropped).toHaveLength(0);
  });
});

describe("isDeepSubset", () => {
  it("is true when the superset only adds keys (registry uuid backfill shape)", () => {
    const raw = { items: [{ name: "Toaster" }] };
    const migrated = { items: [{ name: "Toaster", id: "uuid" }] };
    expect(isDeepSubset(raw, migrated)).toBe(true);
  });

  it("is false when the superset drops a key the subset had", () => {
    expect(isDeepSubset({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("is false when a leaf value differs", () => {
    expect(isDeepSubset({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("is false when arrays differ in length", () => {
    expect(isDeepSubset({ xs: [1, 2] }, { xs: [1, 2, 3] })).toBe(false);
  });

  it("is true for nested equality with extra superset keys", () => {
    expect(isDeepSubset({ a: { b: "c" } }, { a: { b: "c" }, d: 1 })).toBe(true);
  });
});

describe("shouldPersistMigratedConfig", () => {
  const stored = { schemaVersion: 1, a: 1 };

  it("does not persist when a section was dropped", () => {
    const migrated = { ...stored, b: 2 } as unknown as EventPageConfigV1;
    expect(shouldPersistMigratedConfig(stored, migrated, 1)).toBe(false);
  });

  it("does not persist when nothing changed", () => {
    const migrated = { ...stored } as unknown as EventPageConfigV1;
    expect(shouldPersistMigratedConfig(stored, migrated, 0)).toBe(false);
  });

  it("persists a purely-additive backfill (migrated deep-contains stored)", () => {
    const migrated = { ...stored, backfilledId: "x" } as unknown as EventPageConfigV1;
    expect(shouldPersistMigratedConfig(stored, migrated, 0)).toBe(true);
  });

  it("does NOT persist when the migration stripped a field (data-loss guard)", () => {
    const storedWithFutureField = { ...stored, futureField: "keep me" };
    // Older branch's Zod stripped futureField — must not be written back.
    const migrated = { ...stored } as unknown as EventPageConfigV1;
    expect(shouldPersistMigratedConfig(storedWithFutureField, migrated, 0)).toBe(false);
  });
});

describe("validateAndMigrate input guard", () => {
  it("rejects arrays (typeof [] === 'object')", () => {
    expect(() => validateAndMigrate([])).toThrow();
  });

  it("rejects null", () => {
    expect(() => validateAndMigrate(null)).toThrow();
  });
});

describe("mergePreservedSections", () => {
  const sectionsOf = (merged: Record<string, unknown>) =>
    (merged as { sections: unknown[] }).sections;

  it("re-attaches preserved (unparseable) stored sections onto the validated config", () => {
    const stored = makeConfig([validFaq, invalidWeddingParty]);
    const validated = validateAndMigrate(makeConfig([validFaq]));

    const merged = mergePreservedSections({ validatedConfig: validated, storedRawConfig: stored });
    const sections = sectionsOf(merged);
    expect(sections).toHaveLength(2);
    // Preserved section appended, sourced from storage.
    expect(sections[1]).toEqual(invalidWeddingParty);
  });

  it("does not re-attach stored sections that are valid (no duplication)", () => {
    const stored = makeConfig([validFaq, validWeddingParty]);
    const validated = validateAndMigrate(makeConfig([validFaq]));

    const merged = mergePreservedSections({ validatedConfig: validated, storedRawConfig: stored });
    expect(sectionsOf(merged)).toHaveLength(1);
  });

  it("drops a preserved section when its original index is in removedIndices", () => {
    const stored = makeConfig([validFaq, invalidWeddingParty]);
    const validated = validateAndMigrate(makeConfig([validFaq]));

    const merged = mergePreservedSections({
      validatedConfig: validated,
      storedRawConfig: stored,
      removedIndices: [1],
    });
    expect(sectionsOf(merged)).toHaveLength(1);
  });

  it("does NOT cap the merged total — 12 editable + preserved never blocks a save", () => {
    // The strict .max(12) already bounds the editable sections the client sends;
    // preserved (quarantined) sections must not be stripped to fit a ceiling.
    const editable = Array.from({ length: 12 }, () => ({ ...validFaq }));
    const validated = validateAndMigrate(makeConfig(editable));
    const stored = makeConfig([...editable, invalidWeddingParty]);

    const merged = mergePreservedSections({ validatedConfig: validated, storedRawConfig: stored });
    expect(sectionsOf(merged)).toHaveLength(13);
  });
});

describe("getPreservedRegistryItemIds", () => {
  it("collects item ids from a preserved (unparseable) registry section", () => {
    // enabled must be a boolean — the string forces the whole section to fail
    // strict parse (quarantined), while item ids remain readable as raw strings.
    const badRegistry = {
      type: "registry",
      enabled: "yes",
      data: {
        items: [
          { id: "item-1", name: "Gift A" },
          { id: "item-2", name: "Gift B" },
        ],
      },
    };
    const stored = makeConfig([validFaq, badRegistry]);
    const ids = getPreservedRegistryItemIds(stored);
    expect(ids.has("item-1")).toBe(true);
    expect(ids.has("item-2")).toBe(true);
    expect(ids.size).toBe(2);
  });

  it("returns an empty set when there is no preserved registry section", () => {
    const stored = makeConfig([validFaq, validWeddingParty]);
    expect(getPreservedRegistryItemIds(stored).size).toBe(0);
  });
});
