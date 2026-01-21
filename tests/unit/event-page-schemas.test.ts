import { describe, it, expect } from "vitest";
import {
  rsvpSectionDataSchema,
  speakerItemSchema,
  speakerLinkSchema,
  speakersSectionDataSchema,
  sponsorItemSchema,
  sponsorTierSchema,
  sponsorsSectionDataSchema,
  mapSectionDataSchema,
  eventPageConfigV1Schema,
} from "@/schemas/event-page";

describe("rsvpSectionDataSchema", () => {
  it("validates a minimal RSVP section", () => {
    const valid = {
      heading: "RSVP",
      showMaybeOption: true,
      allowPlusOnes: false,
      maxPlusOnes: 0,
    };
    const result = rsvpSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates with all optional fields", () => {
    const valid = {
      heading: "Join Us!",
      description: "Please let us know if you can make it",
      showMaybeOption: false,
      allowPlusOnes: true,
      maxPlusOnes: 3,
      successMessage: "Thank you for your response!",
    };
    const result = rsvpSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects heading over 80 characters", () => {
    const invalid = {
      heading: "A".repeat(81),
      showMaybeOption: true,
      allowPlusOnes: false,
      maxPlusOnes: 0,
    };
    const result = rsvpSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects maxPlusOnes over 10", () => {
    const invalid = {
      heading: "RSVP",
      showMaybeOption: true,
      allowPlusOnes: true,
      maxPlusOnes: 11,
    };
    const result = rsvpSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("applies defaults correctly", () => {
    const minimal = {};
    const result = rsvpSectionDataSchema.parse(minimal);
    expect(result.heading).toBe("RSVP");
    expect(result.showMaybeOption).toBe(true);
    expect(result.allowPlusOnes).toBe(false);
    expect(result.maxPlusOnes).toBe(0);
  });
});

describe("speakerLinkSchema", () => {
  it("validates valid link types", () => {
    const validTypes = ["website", "twitter", "linkedin", "instagram"];
    for (const type of validTypes) {
      const result = speakerLinkSchema.safeParse({
        type,
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid link type", () => {
    const result = speakerLinkSchema.safeParse({
      type: "facebook",
      url: "https://facebook.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = speakerLinkSchema.safeParse({
      type: "website",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("speakerItemSchema", () => {
  it("validates a minimal speaker", () => {
    const valid = {
      name: "Jane Doe",
    };
    const result = speakerItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates speaker with all fields", () => {
    const valid = {
      name: "Dr. Jane Smith",
      role: "Keynote Speaker",
      bio: "A renowned expert in technology.",
      imageAssetId: "clxyz123456",
      links: [
        { type: "twitter", url: "https://twitter.com/janesmith" },
        { type: "linkedin", url: "https://linkedin.com/in/janesmith" },
      ],
    };
    const result = speakerItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const invalid = {
      role: "Speaker",
    };
    const result = speakerItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const invalid = {
      name: "A".repeat(101),
    };
    const result = speakerItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 links", () => {
    const invalid = {
      name: "Jane",
      links: [
        { type: "website", url: "https://1.com" },
        { type: "twitter", url: "https://2.com" },
        { type: "linkedin", url: "https://3.com" },
        { type: "instagram", url: "https://4.com" },
        { type: "website", url: "https://5.com" },
      ],
    };
    const result = speakerItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("speakersSectionDataSchema", () => {
  it("validates a speakers section", () => {
    const valid = {
      heading: "Featured Speakers",
      items: [
        { name: "Jane Doe", role: "Keynote" },
        { name: "John Smith", role: "Panelist" },
      ],
    };
    const result = speakersSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies default heading", () => {
    const minimal = { items: [] };
    const result = speakersSectionDataSchema.parse(minimal);
    expect(result.heading).toBe("Speakers");
  });

  it("rejects more than 12 speakers", () => {
    const invalid = {
      heading: "Speakers",
      items: Array.from({ length: 13 }, (_, i) => ({ name: `Speaker ${i}` })),
    };
    const result = speakersSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("sponsorTierSchema", () => {
  it("validates valid tiers", () => {
    const validTiers = ["platinum", "gold", "silver", "bronze", "partner"];
    for (const tier of validTiers) {
      const result = sponsorTierSchema.safeParse(tier);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid tier", () => {
    const result = sponsorTierSchema.safeParse("diamond");
    expect(result.success).toBe(false);
  });
});

describe("sponsorItemSchema", () => {
  it("validates a minimal sponsor", () => {
    const valid = {
      name: "TechCorp",
    };
    const result = sponsorItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates sponsor with all fields", () => {
    const valid = {
      name: "TechCorp International",
      tier: "platinum",
      logoAssetId: "clxyz123456",
      websiteUrl: "https://techcorp.example.com",
      description: "Leading the future of technology",
    };
    const result = sponsorItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const invalid = {
      tier: "gold",
    };
    const result = sponsorItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid website URL", () => {
    const invalid = {
      name: "TechCorp",
      websiteUrl: "not-a-url",
    };
    const result = sponsorItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects description over 200 characters", () => {
    const invalid = {
      name: "TechCorp",
      description: "A".repeat(201),
    };
    const result = sponsorItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("sponsorsSectionDataSchema", () => {
  it("validates a sponsors section", () => {
    const valid = {
      heading: "Our Sponsors",
      showTiers: true,
      items: [
        { name: "TechCorp", tier: "platinum" },
        { name: "StartUp Inc", tier: "gold" },
      ],
    };
    const result = sponsorsSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies defaults correctly", () => {
    const minimal = { items: [] };
    const result = sponsorsSectionDataSchema.parse(minimal);
    expect(result.heading).toBe("Our Sponsors");
    expect(result.showTiers).toBe(false);
  });

  it("rejects more than 20 sponsors", () => {
    const invalid = {
      heading: "Sponsors",
      showTiers: false,
      items: Array.from({ length: 21 }, (_, i) => ({ name: `Sponsor ${i}` })),
    };
    const result = sponsorsSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("mapSectionDataSchema", () => {
  it("validates a complete map section", () => {
    const valid = {
      heading: "Location",
      address: "123 Main Street, New York, NY 10001",
      latitude: 40.7128,
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    const result = mapSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("validates with optional venue name", () => {
    const valid = {
      heading: "Find Us",
      venueName: "Grand Ballroom",
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    const result = mapSectionDataSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires address", () => {
    const invalid = {
      heading: "Location",
      latitude: 40.7128,
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    const result = mapSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires latitude", () => {
    const invalid = {
      heading: "Location",
      address: "123 Main Street",
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    const result = mapSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires longitude", () => {
    const invalid = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 40.7128,
      zoom: 15,
      showDirectionsLink: true,
    };
    const result = mapSectionDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects latitude out of range", () => {
    const invalidLow = {
      heading: "Location",
      address: "123 Main Street",
      latitude: -91,
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidLow).success).toBe(false);

    const invalidHigh = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 91,
      longitude: -74.006,
      zoom: 15,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidHigh).success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    const invalidLow = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: -181,
      zoom: 15,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidLow).success).toBe(false);

    const invalidHigh = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: 181,
      zoom: 15,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidHigh).success).toBe(false);
  });

  it("rejects zoom out of range", () => {
    const invalidLow = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: -74.006,
      zoom: 0,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidLow).success).toBe(false);

    const invalidHigh = {
      heading: "Location",
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: -74.006,
      zoom: 21,
      showDirectionsLink: true,
    };
    expect(mapSectionDataSchema.safeParse(invalidHigh).success).toBe(false);
  });

  it("applies defaults correctly", () => {
    const minimal = {
      address: "123 Main Street",
      latitude: 40.7128,
      longitude: -74.006,
    };
    const result = mapSectionDataSchema.parse(minimal);
    expect(result.heading).toBe("Location");
    expect(result.zoom).toBe(15);
    expect(result.showDirectionsLink).toBe(true);
  });
});

describe("eventPageConfigV1Schema - sections integration", () => {
  it("validates config with RSVP section", () => {
    const config = {
      schemaVersion: 1,
      theme: {
        preset: "modern",
        primaryColor: "#1e40af",
        fontPair: "modern",
      },
      hero: {
        title: "Test Event",
        align: "center",
        overlay: "soft",
      },
      sections: [
        {
          type: "rsvp",
          enabled: true,
          data: {
            heading: "RSVP",
            showMaybeOption: true,
            allowPlusOnes: false,
            maxPlusOnes: 0,
          },
        },
      ],
    };

    const result = eventPageConfigV1Schema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates config with speakers section", () => {
    const config = {
      schemaVersion: 1,
      theme: {
        preset: "modern",
        primaryColor: "#1e40af",
        fontPair: "modern",
      },
      hero: {
        title: "Test Event",
        align: "center",
        overlay: "soft",
      },
      sections: [
        {
          type: "speakers",
          enabled: true,
          data: {
            heading: "Speakers",
            items: [{ name: "Jane Doe" }],
          },
        },
      ],
    };

    const result = eventPageConfigV1Schema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates config with sponsors section", () => {
    const config = {
      schemaVersion: 1,
      theme: {
        preset: "modern",
        primaryColor: "#1e40af",
        fontPair: "modern",
      },
      hero: {
        title: "Test Event",
        align: "center",
        overlay: "soft",
      },
      sections: [
        {
          type: "sponsors",
          enabled: true,
          data: {
            heading: "Sponsors",
            showTiers: true,
            items: [{ name: "TechCorp", tier: "platinum" }],
          },
        },
      ],
    };

    const result = eventPageConfigV1Schema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates config with map section", () => {
    const config = {
      schemaVersion: 1,
      theme: {
        preset: "modern",
        primaryColor: "#1e40af",
        fontPair: "modern",
      },
      hero: {
        title: "Test Event",
        align: "center",
        overlay: "soft",
      },
      sections: [
        {
          type: "map",
          enabled: true,
          data: {
            heading: "Location",
            address: "123 Main Street",
            latitude: 40.7128,
            longitude: -74.006,
            zoom: 15,
            showDirectionsLink: true,
          },
        },
      ],
    };

    const result = eventPageConfigV1Schema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects invalid section type", () => {
    const config = {
      schemaVersion: 1,
      theme: {
        preset: "modern",
        primaryColor: "#1e40af",
        fontPair: "modern",
      },
      hero: {
        title: "Test Event",
        align: "center",
        overlay: "soft",
      },
      sections: [
        {
          type: "invalid_section",
          enabled: true,
          data: {},
        },
      ],
    };

    const result = eventPageConfigV1Schema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
