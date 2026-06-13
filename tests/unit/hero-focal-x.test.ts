import { describe, it, expect, vi } from "vitest";

// The templates barrel transitively imports next/font/google fonts, which are
// invoked at module load and are not functions under jsdom.
vi.mock("next/font/google", () => import("./helpers/next-font-google-mock"));

import { templateSupportsHeroFocalX } from "@/components/templates";
import { heroFocalXSchema, heroSchema } from "@/schemas/event-page";

describe("templateSupportsHeroFocalX", () => {
  it("is enabled for V2 Cinematic only (the hero that honors backgroundFocalX)", () => {
    expect(templateSupportsHeroFocalX("wedding_v2")).toBe(true);
  });

  it("stays off for the V3 cover heroes (deferred) and everything else", () => {
    // Grand Luxe et al. share the same latent crop but aren't wired yet — the
    // gate must stay false so a future V3 pass flips them deliberately, and so
    // the editor control can't light up as a dead control today.
    expect(templateSupportsHeroFocalX("wedding_grand_luxe")).toBe(false);
    expect(templateSupportsHeroFocalX("wedding_celebration")).toBe(false);
    expect(templateSupportsHeroFocalX("wedding_v1")).toBe(false);
    expect(templateSupportsHeroFocalX("party_v1")).toBe(false);
    expect(templateSupportsHeroFocalX("bogus_template")).toBe(false);
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
