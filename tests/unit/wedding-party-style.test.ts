import { describe, it, expect } from "vitest";
import { resolveWeddingPartyStyleId } from "@/components/templates/wedding-v3/wedding-party-style";
import type {
  WeddingPartyStyleOption,
  WeddingPartyRendererId,
} from "@/components/templates/wedding-v3/types";

// Mirrors Grand Luxe's definition.weddingPartyStyleOptions.
const styleOptions: WeddingPartyStyleOption[] = [
  { value: "cinematic", label: "Cinematic", renderer: "cinematic" },
  { value: "scrapbook", label: "Scrapbook", renderer: "scrapbook-flip" },
];

describe("resolveWeddingPartyStyleId", () => {
  it("maps the selected display style to its renderer", () => {
    expect(resolveWeddingPartyStyleId({ weddingPartyStyleOptions: styleOptions }, "scrapbook")).toBe(
      "scrapbook-flip",
    );
    expect(resolveWeddingPartyStyleId({ weddingPartyStyleOptions: styleOptions }, "cinematic")).toBe(
      "cinematic",
    );
  });

  it("falls back to the first option for an unset or unknown style", () => {
    // Backward compatibility: existing events have no displayStyle → default.
    expect(resolveWeddingPartyStyleId({ weddingPartyStyleOptions: styleOptions }, undefined)).toBe(
      "cinematic",
    );
    expect(resolveWeddingPartyStyleId({ weddingPartyStyleOptions: styleOptions }, "bogus")).toBe(
      "cinematic",
    );
  });

  it("uses the fixed renderer when no style options are declared", () => {
    const fixed: WeddingPartyRendererId = "scrapbook-flip";
    expect(resolveWeddingPartyStyleId({ weddingPartyRenderer: fixed }, "cinematic")).toBe(
      "scrapbook-flip",
    );
  });

  it("returns undefined when neither is set (caller defaults to cinematic)", () => {
    expect(resolveWeddingPartyStyleId({}, undefined)).toBeUndefined();
  });
});
