import { describe, it, expect } from "vitest";
import { resolveWeddingPartyStyleId } from "@/components/templates/wedding-v3/wedding-party-style";
import { GRAND_LUXE } from "@/components/templates/wedding-v3/definitions/grand-luxe";
import { weddingPartyDisplayStyleSchema } from "@/schemas/event-page";
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

// Pins the REAL Grand Luxe definition (not the local fixture above) so a future
// reorder of weddingPartyStyleOptions can't silently change behavior.
describe("GRAND_LUXE wedding-party styles", () => {
  it("keeps cinematic as the backward-compat default (no persisted displayStyle)", () => {
    // Existing Grand Luxe events have no displayStyle → must stay cinematic.
    // Leading the options with scrapbook would silently flip every legacy event;
    // this assertion against the live definition catches that.
    expect(resolveWeddingPartyStyleId(GRAND_LUXE, undefined)).toBe("cinematic");
    expect(GRAND_LUXE.weddingPartyStyleOptions?.[0]?.value).toBe("cinematic");
  });

  it("maps the Scrapbook value to the scrapbook-flip renderer (value != renderer id)", () => {
    // displayStyle 'scrapbook' is NOT a renderer id; it must resolve to the
    // registered 'scrapbook-flip' via the option's `renderer` mapping.
    expect(resolveWeddingPartyStyleId(GRAND_LUXE, "scrapbook")).toBe("scrapbook-flip");
  });

  it("maps the Gilded Frames value to the gilded-frames renderer", () => {
    expect(resolveWeddingPartyStyleId(GRAND_LUXE, "gilded")).toBe("gilded-frames");
  });

  it("declares only option values that are valid displayStyle enum members", () => {
    // Review #4 coverage: a template can't ship an option whose `value` the
    // central displayStyle enum doesn't include (which would fail Zod on save).
    for (const opt of GRAND_LUXE.weddingPartyStyleOptions ?? []) {
      expect(() => weddingPartyDisplayStyleSchema.parse(opt.value)).not.toThrow();
    }
  });
});
