import { describe, it, expect } from "vitest";
import {
  milestoneSchema,
  airportSchema,
  registryItemSchema,
  registrySectionDataSchema,
  chromeConfigSchema,
  heroSchema,
  storySectionDataSchema,
  partyMemberSchema,
  travelStaySectionDataSchema,
  eventPageConfigV1Schema,
} from "@/schemas/event-page";

// =============================================================================
// MILESTONE SCHEMA
// =============================================================================

describe("milestoneSchema", () => {
  it("validates a complete milestone", () => {
    const valid = {
      year: "2020",
      title: "First Date",
      description: "We met at a coffee shop downtown.",
    };
    expect(milestoneSchema.safeParse(valid).success).toBe(true);
  });

  it("validates milestone with image", () => {
    const valid = {
      year: "2021",
      title: "The Proposal",
      description: "He proposed at sunset on the beach.",
      imageAssetId: "clxyz123456",
    };
    expect(milestoneSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects year over 10 characters", () => {
    const invalid = {
      year: "A".repeat(11),
      title: "Test",
      description: "Test description.",
    };
    expect(milestoneSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects title over 60 characters", () => {
    const invalid = {
      year: "2020",
      title: "A".repeat(61),
      description: "Test description.",
    };
    expect(milestoneSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects description over 200 characters", () => {
    const invalid = {
      year: "2020",
      title: "Test",
      description: "A".repeat(201),
    };
    expect(milestoneSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires year, title, and description", () => {
    expect(milestoneSchema.safeParse({}).success).toBe(false);
    expect(milestoneSchema.safeParse({ year: "2020" }).success).toBe(false);
    expect(milestoneSchema.safeParse({ year: "2020", title: "Test" }).success).toBe(false);
  });
});

// =============================================================================
// AIRPORT SCHEMA
// =============================================================================

describe("airportSchema", () => {
  it("validates a complete airport", () => {
    const valid = {
      code: "JFK",
      name: "John F. Kennedy International Airport",
      distance: "45 min drive",
    };
    expect(airportSchema.safeParse(valid).success).toBe(true);
  });

  it("validates without optional distance", () => {
    const valid = {
      code: "LAX",
      name: "Los Angeles International",
    };
    expect(airportSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects code over 10 characters", () => {
    const invalid = {
      code: "A".repeat(11),
      name: "Test Airport",
    };
    expect(airportSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const invalid = {
      code: "TST",
      name: "A".repeat(101),
    };
    expect(airportSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects distance over 50 characters", () => {
    const invalid = {
      code: "TST",
      name: "Test Airport",
      distance: "A".repeat(51),
    };
    expect(airportSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// REGISTRY SCHEMAS
// =============================================================================

describe("registryItemSchema", () => {
  it("validates a minimal registry item", () => {
    const valid = { name: "Amazon" };
    expect(registryItemSchema.safeParse(valid).success).toBe(true);
  });

  it("validates with URL", () => {
    const valid = {
      name: "Crate & Barrel",
      url: "https://crateandbarrel.com/registry",
    };
    expect(registryItemSchema.safeParse(valid).success).toBe(true);
  });

  it("validates with empty string URL", () => {
    const valid = {
      name: "Amazon",
      url: "",
    };
    expect(registryItemSchema.safeParse(valid).success).toBe(true);
  });

  it("validates with logo asset", () => {
    const valid = {
      name: "Target",
      logoAssetId: "clxyz123456",
    };
    expect(registryItemSchema.safeParse(valid).success).toBe(true);
  });

  it("requires name", () => {
    expect(registryItemSchema.safeParse({}).success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const invalid = { name: "A".repeat(101) };
    expect(registryItemSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const invalid = { name: "Test", url: "not-a-url" };
    expect(registryItemSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("registrySectionDataSchema", () => {
  it("validates a complete registry section", () => {
    const valid = {
      heading: "Our Registry",
      description: "Your love and presence is the greatest gift.",
      items: [
        { name: "Amazon", url: "https://amazon.com/registry" },
        { name: "Target", url: "https://target.com/registry" },
      ],
    };
    expect(registrySectionDataSchema.safeParse(valid).success).toBe(true);
  });

  it("applies default heading", () => {
    const result = registrySectionDataSchema.parse({ items: [] });
    expect(result.heading).toBe("Gift Registry");
  });

  it("rejects more than 6 items", () => {
    const invalid = {
      items: Array.from({ length: 7 }, (_, i) => ({ name: `Registry ${i}` })),
    };
    expect(registrySectionDataSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects description over 300 characters", () => {
    const invalid = {
      description: "A".repeat(301),
      items: [],
    };
    expect(registrySectionDataSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// CHROME CONFIG SCHEMA
// =============================================================================

describe("chromeConfigSchema", () => {
  it("validates a complete chrome config", () => {
    const valid = {
      topbar: true,
      scrollProgress: true,
      mountainDividers: false,
      footerSkyline: true,
    };
    expect(chromeConfigSchema.safeParse(valid).success).toBe(true);
  });

  it("validates empty object (all optional)", () => {
    expect(chromeConfigSchema.safeParse({}).success).toBe(true);
  });

  it("validates partial config", () => {
    expect(chromeConfigSchema.safeParse({ topbar: false }).success).toBe(true);
  });
});

// =============================================================================
// EXTENDED HERO SCHEMA (cinematic fields)
// =============================================================================

describe("heroSchema - cinematic fields", () => {
  it("validates standard hero without new fields", () => {
    const valid = {
      title: "Our Wedding",
      align: "center",
      overlay: "soft",
    };
    expect(heroSchema.safeParse(valid).success).toBe(true);
  });

  it("validates cinematic hero with all V2 fields", () => {
    const valid = {
      title: "Join Us",
      subtitle: "For our special day",
      align: "center",
      overlay: "soft",
      style: "cinematic",
      showCountdown: true,
      showScheduleCards: true,
      coupleNames: "Sarah & Michael",
      monogram: "S&M",
    };
    expect(heroSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid style", () => {
    const invalid = {
      title: "Test",
      align: "center",
      overlay: "none",
      style: "fancy",
    };
    expect(heroSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects coupleNames over 60 characters", () => {
    const invalid = {
      title: "Test",
      align: "center",
      overlay: "none",
      coupleNames: "A".repeat(61),
    };
    expect(heroSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects monogram over 5 characters", () => {
    const invalid = {
      title: "Test",
      align: "center",
      overlay: "none",
      monogram: "ABCDEF",
    };
    expect(heroSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// EXTENDED STORY SCHEMA (timeline layout + milestones)
// =============================================================================

describe("storySectionDataSchema - timeline", () => {
  it("validates story with timeline layout and milestones", () => {
    const valid = {
      content: "A".repeat(50),
      layout: "timeline",
      milestones: [
        { year: "2019", title: "First Met", description: "At a coffee shop." },
        { year: "2021", title: "Engaged", description: "Beach proposal at sunset." },
      ],
    };
    expect(storySectionDataSchema.safeParse(valid).success).toBe(true);
  });

  it("validates story without milestones (backward compat)", () => {
    const valid = {
      content: "A".repeat(50),
      layout: "full",
    };
    expect(storySectionDataSchema.safeParse(valid).success).toBe(true);
  });

  it("validates timeline layout enum values", () => {
    for (const layout of ["full", "split", "timeline"]) {
      const result = storySectionDataSchema.safeParse({
        content: "A".repeat(50),
        layout,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects more than 8 milestones", () => {
    const invalid = {
      content: "A".repeat(50),
      layout: "timeline",
      milestones: Array.from({ length: 9 }, (_, i) => ({
        year: `${2015 + i}`,
        title: `Event ${i}`,
        description: "Something happened.",
      })),
    };
    expect(storySectionDataSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// EXTENDED PARTY MEMBER SCHEMA (side field)
// =============================================================================

describe("partyMemberSchema - side field", () => {
  it("validates member without side (backward compat)", () => {
    const valid = {
      name: "Jane Doe",
      role: "Bridesmaid",
    };
    expect(partyMemberSchema.safeParse(valid).success).toBe(true);
  });

  it("validates member with explicit side", () => {
    for (const side of ["bride", "groom", "other"]) {
      const result = partyMemberSchema.safeParse({
        name: "Jane Doe",
        role: "Bridesmaid",
        side,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid side value", () => {
    const invalid = {
      name: "Jane Doe",
      role: "Bridesmaid",
      side: "neither",
    };
    expect(partyMemberSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// EXTENDED TRAVEL & STAY SCHEMA (airports, tips)
// =============================================================================

describe("travelStaySectionDataSchema - airports and tips", () => {
  it("validates with airports and tips", () => {
    const valid = {
      hotels: [],
      airports: [
        { code: "JFK", name: "John F. Kennedy International", distance: "45 min" },
      ],
      tips: ["Rent a car for easier travel", "Book flights early for best rates"],
    };
    expect(travelStaySectionDataSchema.safeParse(valid).success).toBe(true);
  });

  it("validates without airports and tips (backward compat)", () => {
    const valid = {
      hotels: [{ name: "Hilton", address: "123 Main St" }],
    };
    expect(travelStaySectionDataSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects more than 3 airports", () => {
    const invalid = {
      hotels: [],
      airports: Array.from({ length: 4 }, (_, i) => ({
        code: `A${i}`,
        name: `Airport ${i}`,
      })),
    };
    expect(travelStaySectionDataSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects more than 5 tips", () => {
    const invalid = {
      hotels: [],
      tips: Array.from({ length: 6 }, (_, i) => `Tip ${i}`),
    };
    expect(travelStaySectionDataSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects tip over 200 characters", () => {
    const invalid = {
      hotels: [],
      tips: ["A".repeat(201)],
    };
    expect(travelStaySectionDataSchema.safeParse(invalid).success).toBe(false);
  });
});

// =============================================================================
// BACKWARD COMPATIBILITY
// =============================================================================

describe("eventPageConfigV1Schema - backward compatibility", () => {
  const baseConfig = {
    schemaVersion: 1 as const,
    theme: {
      preset: "modern" as const,
      primaryColor: "#1e40af",
      fontPair: "modern" as const,
    },
    hero: {
      title: "Test Event",
      align: "center" as const,
      overlay: "soft" as const,
    },
    sections: [],
  };

  it("validates config without any V2 fields", () => {
    expect(eventPageConfigV1Schema.safeParse(baseConfig).success).toBe(true);
  });

  it("validates config with chrome", () => {
    const withChrome = {
      ...baseConfig,
      chrome: {
        topbar: true,
        scrollProgress: false,
        mountainDividers: true,
        footerSkyline: true,
      },
    };
    expect(eventPageConfigV1Schema.safeParse(withChrome).success).toBe(true);
  });

  it("validates config with registry section", () => {
    const withRegistry = {
      ...baseConfig,
      sections: [
        {
          type: "registry",
          enabled: true,
          data: {
            heading: "Our Registry",
            items: [{ name: "Amazon" }],
          },
        },
      ],
    };
    expect(eventPageConfigV1Schema.safeParse(withRegistry).success).toBe(true);
  });

  it("validates config with cinematic hero", () => {
    const withCinematic = {
      ...baseConfig,
      hero: {
        ...baseConfig.hero,
        style: "cinematic",
        showCountdown: true,
        coupleNames: "Sarah & Michael",
        monogram: "S&M",
      },
    };
    expect(eventPageConfigV1Schema.safeParse(withCinematic).success).toBe(true);
  });

  it("validates config with timeline story and milestones", () => {
    const withTimeline = {
      ...baseConfig,
      sections: [
        {
          type: "story",
          enabled: true,
          data: {
            content: "A".repeat(50),
            layout: "timeline",
            milestones: [
              { year: "2020", title: "Met", description: "At a coffee shop." },
            ],
          },
        },
      ],
    };
    expect(eventPageConfigV1Schema.safeParse(withTimeline).success).toBe(true);
  });

  it("validates config with wedding party side field", () => {
    const withSides = {
      ...baseConfig,
      sections: [
        {
          type: "weddingParty",
          enabled: true,
          data: {
            heading: "Wedding Party",
            members: [
              { name: "Jane", role: "Bridesmaid", side: "bride" },
              { name: "John", role: "Best Man", side: "groom" },
            ],
          },
        },
      ],
    };
    expect(eventPageConfigV1Schema.safeParse(withSides).success).toBe(true);
  });

  it("validates config with travel & stay airports and tips", () => {
    const withExtended = {
      ...baseConfig,
      sections: [
        {
          type: "travelStay",
          enabled: true,
          data: {
            hotels: [],
            airports: [{ code: "JFK", name: "JFK International" }],
            tips: ["Fly into JFK for shortest drive"],
          },
        },
      ],
    };
    expect(eventPageConfigV1Schema.safeParse(withExtended).success).toBe(true);
  });
});
