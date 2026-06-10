import { describe, it, expect, vi } from "vitest";

// The templates barrel transitively imports next/font/google fonts, which are
// invoked at module load and are not functions under jsdom.
vi.mock("next/font/google", () => import("./helpers/next-font-google-mock"));

import { templateSupportsHeroBackgroundTreatment } from "@/components/templates";
import { isFloatingCouplePhotoActive } from "@/components/templates/shared/CouplePhotoFrame/frame-options";
import { GRAND_LUXE } from "@/components/templates/wedding-v3/definitions/grand-luxe";
import { heroBackgroundTreatmentSchema, heroSchema } from "@/schemas/event-page";

describe("templateSupportsHeroBackgroundTreatment", () => {
  it("is enabled for V2 Cinematic and Grand Luxe (heroes that implement portrait)", () => {
    expect(templateSupportsHeroBackgroundTreatment("wedding_v2")).toBe(true);
    expect(templateSupportsHeroBackgroundTreatment("wedding_grand_luxe")).toBe(true);
  });

  it("stays off for templates whose heroes don't implement the treatment", () => {
    // Celebration's mosaic hero composition contradicts a single full-bleed
    // portrait; V1 and non-wedding templates never opted in.
    expect(templateSupportsHeroBackgroundTreatment("wedding_celebration")).toBe(false);
    expect(templateSupportsHeroBackgroundTreatment("wedding_v1")).toBe(false);
    expect(templateSupportsHeroBackgroundTreatment("party_v1")).toBe(false);
    expect(templateSupportsHeroBackgroundTreatment("bogus_template")).toBe(false);
  });

  it("Grand Luxe opts in via its definition flag", () => {
    expect(GRAND_LUXE.supportsHeroBackgroundTreatment).toBe(true);
  });
});

describe("isFloatingCouplePhotoActive", () => {
  it("deactivates the floating couple photo only for portrait", () => {
    expect(isFloatingCouplePhotoActive("portrait")).toBe(false);
    expect(isFloatingCouplePhotoActive("ambience")).toBe(true);
  });

  it("stays active when unset (backward compat — existing events)", () => {
    expect(isFloatingCouplePhotoActive(undefined)).toBe(true);
  });
});

describe("heroSchema backgroundTreatment field", () => {
  const baseHero = { title: "Our Wedding", align: "center", overlay: "soft" };

  it("accepts both treatment values", () => {
    for (const treatment of ["ambience", "portrait"]) {
      expect(() =>
        heroSchema.parse({ ...baseHero, backgroundTreatment: treatment })
      ).not.toThrow();
      expect(() => heroBackgroundTreatmentSchema.parse(treatment)).not.toThrow();
    }
  });

  it("rejects unknown treatment values", () => {
    expect(() =>
      heroSchema.parse({ ...baseHero, backgroundTreatment: "spotlight" })
    ).toThrow();
  });

  it("parses legacy configs without the field (backward compat — unset = ambience)", () => {
    // Existing events have no backgroundTreatment; renderers treat unset as
    // ambience, so today's look is byte-identical.
    const parsed = heroSchema.parse(baseHero);
    expect(parsed.backgroundTreatment).toBeUndefined();
  });
});
