import { describe, it, expect } from "vitest";
import {
  resolveCouplePhotoFrame,
  isCutoutCouplePhotoActive,
  HEART_FRAME_OPTION,
  CIRCLE_FRAME_OPTION,
  FULL_LENGTH_FRAME_OPTION,
  CUTOUT_FRAME_OPTION,
  type CouplePhotoFrameOption,
} from "@/components/templates/shared/CouplePhotoFrame/frame-options";
import { GRAND_LUXE } from "@/components/templates/wedding-v3/definitions/grand-luxe";
import { CELEBRATION } from "@/components/templates/wedding-v3/definitions/celebration";
import { WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS } from "@/components/templates/wedding-v2/couple-photo-frame-options";
import { couplePhotoFrameSchema, heroSchema } from "@/schemas/event-page";

const options: CouplePhotoFrameOption[] = [
  HEART_FRAME_OPTION,
  CIRCLE_FRAME_OPTION,
  FULL_LENGTH_FRAME_OPTION,
];

describe("resolveCouplePhotoFrame", () => {
  it("returns the persisted frame when it is among the options", () => {
    expect(resolveCouplePhotoFrame(options, "circle")).toBe("circle");
    expect(resolveCouplePhotoFrame(options, "full")).toBe("full");
  });

  it("falls back to the first option for an unset or unknown frame", () => {
    // Backward compatibility: existing events have no couplePhotoFrame → default.
    expect(resolveCouplePhotoFrame(options, undefined)).toBe("heart");
    expect(resolveCouplePhotoFrame(options, "bogus")).toBe("heart");
  });

  it("returns undefined when the template declares no options", () => {
    expect(resolveCouplePhotoFrame(undefined, "circle")).toBeUndefined();
    expect(resolveCouplePhotoFrame([], "circle")).toBeUndefined();
  });
});

// Pins the REAL curated lists so a future reorder can't silently re-frame
// every existing event that has no persisted couplePhotoFrame.
describe("template couple-photo frame defaults", () => {
  it("Grand Luxe keeps heart as the backward-compat default", () => {
    expect(GRAND_LUXE.couplePhotoFrameOptions?.[0]?.value).toBe("heart");
    expect(resolveCouplePhotoFrame(GRAND_LUXE.couplePhotoFrameOptions, undefined)).toBe("heart");
  });

  it("Celebration keeps circle as the backward-compat default", () => {
    expect(CELEBRATION.couplePhotoFrameOptions?.[0]?.value).toBe("circle");
    expect(resolveCouplePhotoFrame(CELEBRATION.couplePhotoFrameOptions, undefined)).toBe("circle");
  });

  it("Celebration enrolls the cutout option", () => {
    expect(
      CELEBRATION.couplePhotoFrameOptions?.some((o) => o.value === "cutout")
    ).toBe(true);
    expect(resolveCouplePhotoFrame(CELEBRATION.couplePhotoFrameOptions, "cutout")).toBe("cutout");
  });

  it("V2 Cinematic keeps circle as the backward-compat default", () => {
    expect(WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS[0]?.value).toBe("circle");
  });

  it("declares only option values that are valid couplePhotoFrame enum members", () => {
    // A template can't ship an option whose `value` the central enum doesn't
    // include (which would fail Zod on save).
    const declared = [
      ...(GRAND_LUXE.couplePhotoFrameOptions ?? []),
      ...(CELEBRATION.couplePhotoFrameOptions ?? []),
      ...WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS,
    ];
    expect(declared.length).toBeGreaterThan(0);
    for (const opt of declared) {
      expect(() => couplePhotoFrameSchema.parse(opt.value)).not.toThrow();
    }
  });
});

describe("cutout frame option", () => {
  it("resolves like any curated option, and falls back to the default when not enrolled", () => {
    const withCutout = [...options, CUTOUT_FRAME_OPTION];
    expect(resolveCouplePhotoFrame(withCutout, "cutout")).toBe("cutout");
    // A persisted "cutout" on a template that has NOT enrolled the option
    // resolves to that template's default — never renders frameless by accident.
    expect(resolveCouplePhotoFrame(options, "cutout")).toBe("heart");
  });
});

describe("isCutoutCouplePhotoActive", () => {
  it("is active when cutout is resolved, a photo is selected, and not in portrait", () => {
    expect(
      isCutoutCouplePhotoActive({
        resolvedFrame: "cutout",
        hasCouplePhoto: true,
        backgroundTreatment: undefined,
      })
    ).toBe(true);
    expect(
      isCutoutCouplePhotoActive({
        resolvedFrame: "cutout",
        hasCouplePhoto: true,
        backgroundTreatment: "ambience",
      })
    ).toBe(true);
  });

  it("stays inactive without a selected photo (hero cards must not be suppressed)", () => {
    expect(
      isCutoutCouplePhotoActive({
        resolvedFrame: "cutout",
        hasCouplePhoto: false,
        backgroundTreatment: undefined,
      })
    ).toBe(false);
  });

  it("stays inactive under the portrait background treatment", () => {
    // Portrait already suppresses every floating couple photo (#190) — a
    // persisted cutout frame must not double-dip into card suppression.
    expect(
      isCutoutCouplePhotoActive({
        resolvedFrame: "cutout",
        hasCouplePhoto: true,
        backgroundTreatment: "portrait",
      })
    ).toBe(false);
  });

  it("stays inactive for every non-cutout frame", () => {
    for (const frame of ["heart", "circle", "full", undefined] as const) {
      expect(
        isCutoutCouplePhotoActive({
          resolvedFrame: frame,
          hasCouplePhoto: true,
          backgroundTreatment: undefined,
        })
      ).toBe(false);
    }
  });
});

describe("heroSchema couplePhotoFrame field", () => {
  const baseHero = { title: "Our Wedding", align: "center", overlay: "soft" };

  it("accepts each frame value", () => {
    for (const frame of ["heart", "circle", "full", "cutout"]) {
      expect(() =>
        heroSchema.parse({ ...baseHero, couplePhotoFrame: frame })
      ).not.toThrow();
    }
  });

  it("rejects unknown frame values", () => {
    expect(() =>
      heroSchema.parse({ ...baseHero, couplePhotoFrame: "oval" })
    ).toThrow();
  });

  it("parses legacy configs without the field (backward compat)", () => {
    const parsed = heroSchema.parse(baseHero);
    expect(parsed.couplePhotoFrame).toBeUndefined();
  });
});
