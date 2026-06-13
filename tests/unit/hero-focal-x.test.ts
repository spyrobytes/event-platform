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

  it("accepts left, center, and right", () => {
    for (const focal of ["left", "center", "right"]) {
      expect(() =>
        heroSchema.parse({ ...baseHero, backgroundFocalX: focal })
      ).not.toThrow();
      expect(() => heroFocalXSchema.parse(focal)).not.toThrow();
    }
  });

  it("rejects unknown focal values", () => {
    expect(() =>
      heroSchema.parse({ ...baseHero, backgroundFocalX: "top" })
    ).toThrow();
  });

  it("parses legacy configs without the field (backward compat — unset = center)", () => {
    // Existing events have no backgroundFocalX; the renderer treats unset as
    // "center", so today's crop is byte-identical.
    const parsed = heroSchema.parse(baseHero);
    expect(parsed.backgroundFocalX).toBeUndefined();
  });
});
