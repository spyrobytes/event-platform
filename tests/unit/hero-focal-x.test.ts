import { describe, it, expect, vi } from "vitest";

// The templates barrel transitively imports next/font/google fonts, which are
// invoked at module load and are not functions under jsdom.
vi.mock("next/font/google", () => import("./helpers/next-font-google-mock"));

import { templateSupportsHeroFocalX } from "@/components/templates";
import { GRAND_LUXE } from "@/components/templates/wedding-v3/definitions/grand-luxe";
import { CELEBRATION } from "@/components/templates/wedding-v3/definitions/celebration";
import { heroFocalXSchema, heroSchema } from "@/schemas/event-page";

describe("templateSupportsHeroFocalX", () => {
  it("is enabled for the single full-bleed cover heroes (V2, Grand Luxe, Celebration)", () => {
    expect(templateSupportsHeroFocalX("wedding_v2")).toBe(true);
    expect(templateSupportsHeroFocalX("wedding_grand_luxe")).toBe(true);
    // Celebration's "collage-mosaic" hero is a SINGLE cover image (the mosaic
    // is the content-styling language, not a multi-image background), so it
    // qualifies — unlike for backgroundTreatment, which it opts out of.
    expect(templateSupportsHeroFocalX("wedding_celebration")).toBe(true);
  });

  it("stays off for templates without a single full-bleed cover hero", () => {
    // wedding_garden_house is a REAL V3 definition that leaves the flag unset —
    // it exercises the gate's `?? false` real-V3-unset path (not just the
    // undefined-definition short-circuit that v1/party/bogus hit), so a future
    // refactor that defaulted unset V3 flags to true would fail here instead of
    // silently lighting the control on a hero with no [data-focal] CSS rules.
    expect(templateSupportsHeroFocalX("wedding_garden_house")).toBe(false);
    expect(templateSupportsHeroFocalX("wedding_v1")).toBe(false);
    expect(templateSupportsHeroFocalX("party_v1")).toBe(false);
    expect(templateSupportsHeroFocalX("bogus_template")).toBe(false);
  });

  it("Grand Luxe and Celebration opt in via their definition flags", () => {
    expect(GRAND_LUXE.supportsHeroFocalX).toBe(true);
    expect(CELEBRATION.supportsHeroFocalX).toBe(true);
  });
});

describe("heroSchema backgroundFocalX field", () => {
  const baseHero = { title: "Our Wedding", align: "center", overlay: "soft" };

  it("accepts left, center, right, and edges", () => {
    for (const focal of ["left", "center", "right", "edges"]) {
      expect(() =>
        heroSchema.parse({ ...baseHero, backgroundFocalX: focal })
      ).not.toThrow();
      expect(() => heroFocalXSchema.parse(focal)).not.toThrow();
    }
  });

  it("rejects unknown focal values", () => {
    // "both" is the label-shaped mistake for "edges"; "top" is the axis
    // mistake. Both must fail so a typo can't silently persist.
    for (const bogus of ["top", "both"]) {
      expect(() =>
        heroSchema.parse({ ...baseHero, backgroundFocalX: bogus })
      ).toThrow();
    }
  });

  it("parses legacy configs without the field (backward compat — unset = center)", () => {
    // Existing events have no backgroundFocalX; the renderer treats unset as
    // "center", so today's crop is byte-identical.
    const parsed = heroSchema.parse(baseHero);
    expect(parsed.backgroundFocalX).toBeUndefined();
  });
});
