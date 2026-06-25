import { describe, it, expect } from "vitest";

import { templateHonorsGalleryDisplayMode } from "@/lib/gallery-display-mode";

// Drives whether the editor offers the gallery display-mode / transition /
// auto-play controls. V3 templates use a fixed curated renderer that ignores
// displayMode, so they must classify as false.
describe("templateHonorsGalleryDisplayMode", () => {
  it("is true for templates whose gallery renderer reads displayMode", () => {
    for (const id of ["wedding_v1", "wedding_v2", "conference_v1", "party_v1"]) {
      expect(templateHonorsGalleryDisplayMode(id)).toBe(true);
    }
  });

  it("is false for V3 templates (fixed curated renderer ignores displayMode)", () => {
    for (const id of [
      "wedding_editorial",
      "wedding_intimate_note",
      "wedding_fine_art",
      "wedding_garden_house",
      "wedding_grand_luxe",
      "wedding_celebration",
    ]) {
      expect(templateHonorsGalleryDisplayMode(id)).toBe(false);
    }
  });

  it("is false for unknown / missing ids (don't offer an unconfirmed control)", () => {
    expect(templateHonorsGalleryDisplayMode(undefined)).toBe(false);
    expect(templateHonorsGalleryDisplayMode(null)).toBe(false);
    expect(templateHonorsGalleryDisplayMode("not_a_template")).toBe(false);
  });
});
