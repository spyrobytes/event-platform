import { describe, it, expect } from "vitest";
import {
  getDefaultVisibility,
  getEffectiveVisibility,
  filterSectionsByVisibility,
  hasGuestOnlySections,
  getSectionLabel,
  buildPortalUrl,
} from "@/lib/guest-access";
import type { Section, SectionVisibility } from "@/schemas/event-page";

// =============================================================================
// HELPERS
// =============================================================================

function makeSection(
  type: string,
  overrides: { enabled?: boolean; visibility?: SectionVisibility } = {}
): Section {
  const { enabled = true, visibility } = overrides;

  // Build a minimal valid section for the given type
  const base = { type, enabled, ...(visibility !== undefined ? { visibility } : {}) };

  switch (type) {
    case "details":
      return { ...base, type: "details", data: { dateText: "Jan 1", locationText: "NYC" } } as Section;
    case "schedule":
      return { ...base, type: "schedule", data: { items: [] } } as Section;
    case "faq":
      return { ...base, type: "faq", data: { items: [] } } as Section;
    case "gallery":
      return { ...base, type: "gallery", data: {} } as Section;
    case "rsvp":
      return { ...base, type: "rsvp", data: { heading: "RSVP", showMaybeOption: true, allowPlusOnes: false, maxPlusOnes: 0 } } as Section;
    case "speakers":
      return { ...base, type: "speakers", data: { heading: "Speakers", items: [] } } as Section;
    case "sponsors":
      return { ...base, type: "sponsors", data: { heading: "Sponsors", showTiers: false, items: [] } } as Section;
    case "map":
      return { ...base, type: "map", data: { heading: "Location", address: "123 St", latitude: 40, longitude: -74, zoom: 15, showDirectionsLink: true } } as Section;
    case "story":
      return { ...base, type: "story", data: { heading: "Our Story", content: "A".repeat(50), layout: "full" } } as Section;
    case "travelStay":
      return { ...base, type: "travelStay", data: { heading: "Travel", hotels: [] } } as Section;
    case "weddingParty":
      return { ...base, type: "weddingParty", data: { heading: "Wedding Party", members: [] } } as Section;
    case "attire":
      return { ...base, type: "attire", data: { heading: "Dress Code", dressCode: "Formal" } } as Section;
    case "thingsToDo":
      return { ...base, type: "thingsToDo", data: { heading: "Things To Do", items: [] } } as Section;
    case "registry":
      return { ...base, type: "registry", data: { heading: "Gift Registry", items: [] } } as Section;
    case "wishes":
      return { ...base, type: "wishes", data: { heading: "Wedding Wishes", previewCount: 3, enableSubmissions: true } } as Section;
    case "livestream":
      // Primary is omitted — the empty / "section added, URL not yet pasted"
      // state. Visibility filtering doesn't depend on data shape.
      return { ...base, type: "livestream", data: { heading: "Live Stream", ctaLabel: "Watch live", showCountdown: true, useNocookie: true } } as Section;
    default:
      throw new Error(`Unknown test section type: ${type}`);
  }
}

// =============================================================================
// getDefaultVisibility
// =============================================================================

describe("getDefaultVisibility", () => {
  it("returns 'public' for public-by-default section types", () => {
    expect(getDefaultVisibility("details")).toBe("public");
    expect(getDefaultVisibility("faq")).toBe("public");
    expect(getDefaultVisibility("map")).toBe("public");
    expect(getDefaultVisibility("speakers")).toBe("public");
    expect(getDefaultVisibility("sponsors")).toBe("public");
    expect(getDefaultVisibility("rsvp")).toBe("public");
  });

  it("returns 'guests' for guest-by-default section types", () => {
    expect(getDefaultVisibility("schedule")).toBe("guests");
    expect(getDefaultVisibility("gallery")).toBe("guests");
    expect(getDefaultVisibility("story")).toBe("guests");
    expect(getDefaultVisibility("weddingParty")).toBe("guests");
    expect(getDefaultVisibility("attire")).toBe("guests");
    expect(getDefaultVisibility("travelStay")).toBe("guests");
    expect(getDefaultVisibility("thingsToDo")).toBe("guests");
    expect(getDefaultVisibility("registry")).toBe("guests");
    expect(getDefaultVisibility("wishes")).toBe("guests");
    expect(getDefaultVisibility("livestream")).toBe("guests");
  });

  it("returns 'public' for unknown section types (safe fallback)", () => {
    expect(getDefaultVisibility("unknown_section")).toBe("public");
    expect(getDefaultVisibility("")).toBe("public");
  });
});

// =============================================================================
// getEffectiveVisibility
// =============================================================================

describe("getEffectiveVisibility", () => {
  it("returns the explicit visibility when set", () => {
    const section = makeSection("gallery", { visibility: "public" });
    expect(getEffectiveVisibility(section)).toBe("public");
  });

  it("returns the explicit visibility even if it differs from default", () => {
    // gallery defaults to 'guests', but if explicitly set to 'public'
    const section = makeSection("gallery", { visibility: "public" });
    expect(getEffectiveVisibility(section)).toBe("public");

    // details defaults to 'public', but if explicitly set to 'hidden'
    const section2 = makeSection("details", { visibility: "hidden" });
    expect(getEffectiveVisibility(section2)).toBe("hidden");
  });

  it("falls back to type-based default when visibility is not set", () => {
    const gallery = makeSection("gallery");
    expect(getEffectiveVisibility(gallery)).toBe("guests");

    const details = makeSection("details");
    expect(getEffectiveVisibility(details)).toBe("public");
  });
});

// =============================================================================
// filterSectionsByVisibility
// =============================================================================

describe("filterSectionsByVisibility", () => {
  it("shows all enabled public sections for public access", () => {
    const sections = [
      makeSection("details"),
      makeSection("faq"),
      makeSection("map"),
    ];
    const result = filterSectionsByVisibility(sections, "public");
    expect(result).toHaveLength(3);
  });

  it("hides guest-default sections from public viewers", () => {
    const sections = [
      makeSection("details"),     // default: public
      makeSection("gallery"),     // default: guests
      makeSection("story"),       // default: guests
      makeSection("faq"),         // default: public
    ];
    const result = filterSectionsByVisibility(sections, "public");
    expect(result).toHaveLength(2);
    expect(result.map(s => s.type)).toEqual(["details", "faq"]);
  });

  it("shows guest-default sections for guest viewers", () => {
    const sections = [
      makeSection("details"),
      makeSection("gallery"),
      makeSection("story"),
      makeSection("faq"),
    ];
    const result = filterSectionsByVisibility(sections, "guest");
    expect(result).toHaveLength(4);
  });

  it("always hides sections with visibility=hidden", () => {
    const sections = [
      makeSection("details", { visibility: "hidden" }),
      makeSection("gallery", { visibility: "hidden" }),
    ];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(0);
    expect(filterSectionsByVisibility(sections, "guest")).toHaveLength(0);
  });

  it("always hides disabled sections regardless of visibility", () => {
    const sections = [
      makeSection("details", { enabled: false }),
      makeSection("gallery", { enabled: false, visibility: "public" }),
    ];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(0);
    expect(filterSectionsByVisibility(sections, "guest")).toHaveLength(0);
  });

  it("respects explicit visibility overrides", () => {
    const sections = [
      // gallery defaults to guests, but explicitly set to public
      makeSection("gallery", { visibility: "public" }),
      // details defaults to public, but explicitly set to guests
      makeSection("details", { visibility: "guests" }),
    ];

    const publicResult = filterSectionsByVisibility(sections, "public");
    expect(publicResult).toHaveLength(1);
    expect(publicResult[0].type).toBe("gallery");

    const guestResult = filterSectionsByVisibility(sections, "guest");
    expect(guestResult).toHaveLength(2);
  });

  it("handles empty sections array", () => {
    expect(filterSectionsByVisibility([], "public")).toHaveLength(0);
    expect(filterSectionsByVisibility([], "guest")).toHaveLength(0);
  });

  it("handles mixed enabled/disabled/visibility combinations", () => {
    const sections = [
      makeSection("details"),                                    // enabled, default public
      makeSection("schedule", { enabled: false }),               // disabled
      makeSection("gallery", { visibility: "public" }),          // enabled, override to public
      makeSection("story", { visibility: "hidden" }),            // enabled but hidden
      makeSection("attire"),                                     // enabled, default guests
    ];

    const publicResult = filterSectionsByVisibility(sections, "public");
    expect(publicResult.map(s => s.type)).toEqual(["details", "gallery"]);

    const guestResult = filterSectionsByVisibility(sections, "guest");
    expect(guestResult.map(s => s.type)).toEqual(["details", "gallery", "attire"]);
  });
});

// =============================================================================
// Livestream-specific visibility coverage
// =============================================================================

describe("filterSectionsByVisibility — livestream", () => {
  it("drops a guests-default livestream section from a public viewer", () => {
    // Default visibility = "guests" (wedding-safe). Public viewers (no
    // ?tk= token) must not see the section at all on the main event page —
    // otherwise we'd render a CTA that links to a 404 sub-page (because
    // /e/[slug]/live also filters by visibility).
    const sections = [makeSection("livestream")];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(0);
  });

  it("shows guests-default livestream to a guest viewer", () => {
    const sections = [makeSection("livestream")];
    const result = filterSectionsByVisibility(sections, "guest");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("livestream");
  });

  it("respects explicit public override for livestream (conference use case)", () => {
    // Conference/community streams that want broad reach flip visibility
    // to public. Should be visible to public viewers.
    const sections = [
      makeSection("livestream", { visibility: "public" }),
    ];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(1);
  });

  it("respects explicit hidden override for livestream", () => {
    const sections = [
      makeSection("livestream", { visibility: "hidden" }),
    ];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(0);
    expect(filterSectionsByVisibility(sections, "guest")).toHaveLength(0);
  });

  it("disabled livestream is filtered out regardless of access level", () => {
    const sections = [
      makeSection("livestream", { enabled: false, visibility: "public" }),
    ];
    expect(filterSectionsByVisibility(sections, "public")).toHaveLength(0);
    expect(filterSectionsByVisibility(sections, "guest")).toHaveLength(0);
  });

  it("legacy livestream section without visibility falls back to guests default", () => {
    const legacy = {
      type: "livestream" as const,
      enabled: true,
      data: { heading: "Live Stream", ctaLabel: "Watch live", showCountdown: true, useNocookie: true },
    } as Section;
    expect(filterSectionsByVisibility([legacy], "public")).toHaveLength(0);
    expect(filterSectionsByVisibility([legacy], "guest")).toHaveLength(1);
  });
});

// =============================================================================
// hasGuestOnlySections
// =============================================================================

describe("hasGuestOnlySections", () => {
  it("returns true when there are enabled guest-default sections", () => {
    const sections = [
      makeSection("details"),
      makeSection("gallery"),  // default: guests
    ];
    expect(hasGuestOnlySections(sections)).toBe(true);
  });

  it("returns true when sections have explicit guests visibility", () => {
    const sections = [
      makeSection("details", { visibility: "guests" }),
    ];
    expect(hasGuestOnlySections(sections)).toBe(true);
  });

  it("returns false when all sections are public", () => {
    const sections = [
      makeSection("details"),
      makeSection("faq"),
      makeSection("map"),
    ];
    expect(hasGuestOnlySections(sections)).toBe(false);
  });

  it("returns false when guest-default sections are disabled", () => {
    const sections = [
      makeSection("details"),
      makeSection("gallery", { enabled: false }),
    ];
    expect(hasGuestOnlySections(sections)).toBe(false);
  });

  it("returns false for empty sections", () => {
    expect(hasGuestOnlySections([])).toBe(false);
  });
});

// =============================================================================
// getSectionLabel
// =============================================================================

describe("getSectionLabel", () => {
  it("returns human-readable labels for all known section types", () => {
    expect(getSectionLabel("details")).toBe("Details");
    expect(getSectionLabel("schedule")).toBe("Schedule");
    expect(getSectionLabel("faq")).toBe("FAQ");
    expect(getSectionLabel("gallery")).toBe("Gallery");
    expect(getSectionLabel("rsvp")).toBe("RSVP");
    expect(getSectionLabel("speakers")).toBe("Speakers");
    expect(getSectionLabel("sponsors")).toBe("Sponsors");
    expect(getSectionLabel("map")).toBe("Location");
    expect(getSectionLabel("story")).toBe("Our Story");
    expect(getSectionLabel("travelStay")).toBe("Travel & Stay");
    expect(getSectionLabel("weddingParty")).toBe("Wedding Party");
    expect(getSectionLabel("attire")).toBe("Attire");
    expect(getSectionLabel("thingsToDo")).toBe("Things to Do");
    expect(getSectionLabel("registry")).toBe("Gift Registry");
    expect(getSectionLabel("wishes")).toBe("Wedding Wishes");
    expect(getSectionLabel("livestream")).toBe("Live Stream");
  });

  it("falls back to raw type for unknown sections", () => {
    expect(getSectionLabel("customThing")).toBe("customThing");
  });
});

// =============================================================================
// buildPortalUrl
// =============================================================================

describe("buildPortalUrl", () => {
  it("builds a valid portal URL", () => {
    const url = buildPortalUrl("my-wedding", "abc123token");
    expect(url).toContain("/e/my-wedding?tk=abc123token");
  });

  it("uses NEXT_PUBLIC_BASE_URL when set", () => {
    const orig = process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
    const url = buildPortalUrl("my-event", "token123");
    expect(url).toBe("https://example.com/e/my-event?tk=token123");
    process.env.NEXT_PUBLIC_BASE_URL = orig;
  });

  it("falls back to eventfxr.com when env var is not set", () => {
    const orig = process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    const url = buildPortalUrl("my-event", "token123");
    expect(url).toBe("https://eventfxr.com/e/my-event?tk=token123");
    process.env.NEXT_PUBLIC_BASE_URL = orig;
  });
});

// =============================================================================
// Schema backward compatibility
// =============================================================================

describe("visibility field backward compatibility", () => {
  it("sections without visibility field work with getEffectiveVisibility", () => {
    // Simulate a legacy section (no visibility field at all)
    const legacySection = {
      type: "gallery" as const,
      enabled: true,
      data: {},
    } as Section;

    expect(getEffectiveVisibility(legacySection)).toBe("guests");
  });

  it("filterSectionsByVisibility handles legacy sections without visibility", () => {
    const legacySections = [
      { type: "details" as const, enabled: true, data: { dateText: "Jan 1", locationText: "NYC" } },
      { type: "gallery" as const, enabled: true, data: {} },
    ] as Section[];

    const publicResult = filterSectionsByVisibility(legacySections, "public");
    expect(publicResult).toHaveLength(1);
    expect(publicResult[0].type).toBe("details");

    const guestResult = filterSectionsByVisibility(legacySections, "guest");
    expect(guestResult).toHaveLength(2);
  });
});
