import { describe, it, expect } from "vitest";

import {
  resolveV2DisplayStyle,
  isV2Scrapbook,
} from "@/components/templates/wedding-v2/variants";

// Shared resolver used by both the V2 renderer and the page editor, so they
// can't drift on what counts as scrapbook. `scrapbook_edition` is a legacy
// scrapbook variant (galleryRenderer/weddingPartyRenderer = "scrapbook");
// `midnight_gold` is a standard skin.
describe("resolveV2DisplayStyle", () => {
  it("uses an explicit displayStyle, ignoring the variant", () => {
    expect(resolveV2DisplayStyle("scrapbook", "midnight_gold")).toBe("scrapbook");
    expect(resolveV2DisplayStyle("standard", "scrapbook_edition")).toBe("standard");
  });

  it("falls back to a legacy scrapbook variant when displayStyle is unset", () => {
    expect(resolveV2DisplayStyle(undefined, "scrapbook_edition")).toBe("scrapbook");
    expect(resolveV2DisplayStyle(null, "scrapbook_edition")).toBe("scrapbook");
  });

  it("is standard for a non-scrapbook variant or no variant", () => {
    expect(resolveV2DisplayStyle(undefined, "midnight_gold")).toBe("standard");
    expect(resolveV2DisplayStyle(undefined, undefined)).toBe("standard");
    expect(resolveV2DisplayStyle(null, null)).toBe("standard");
  });
});

describe("isV2Scrapbook", () => {
  it("is true only when the resolved style is scrapbook (incl. legacy variants)", () => {
    expect(isV2Scrapbook(undefined, "scrapbook_edition")).toBe(true);
    expect(isV2Scrapbook("scrapbook", undefined)).toBe(true);
    expect(isV2Scrapbook(undefined, "midnight_gold")).toBe(false);
    expect(isV2Scrapbook("standard", "scrapbook_edition")).toBe(false);
    expect(isV2Scrapbook(undefined, undefined)).toBe(false);
  });
});
