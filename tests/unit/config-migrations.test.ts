import { describe, it, expect } from "vitest";
import { migratePageConfig, validateAndMigrate } from "@/lib/config-migrations";

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
