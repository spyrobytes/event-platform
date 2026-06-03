import { describe, it, expect, vi } from "vitest";

// The renderers barrel transitively imports next/font/google fonts, which are
// invoked at module load and are not functions under jsdom. Stub each font used
// across the renderer tree so the registry is importable here. (If a new
// next/font/google font is added anywhere in that tree, add it below — the
// failure message points straight at the missing name.)
vi.mock("next/font/google", () => {
  const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });
  return {
    Great_Vibes: font,
    Dancing_Script: font,
    Playfair_Display: font,
    Cormorant_Garamond: font,
    Pinyon_Script: font,
    Geist: font,
    Geist_Mono: font,
  };
});

import { weddingPartyRenderers } from "@/components/templates/wedding-v3/renderers";
import { CouturePolaroidWeddingParty } from "@/components/templates/wedding-v3/renderers/wedding-party/CouturePolaroidWeddingParty";
import { GildedFramesWeddingParty } from "@/components/templates/wedding-v3/renderers/wedding-party/GildedFramesWeddingParty";

// resolveWeddingPartyStyleId is tested separately (string mapping). This guards
// the other half: that each renderer id is wired to the RIGHT component. TS only
// checks the value is *a* WeddingPartyRenderer, so a copy-paste swap (e.g.
// pointing "couture-polaroid" at GildedFramesWeddingParty) would compile and the
// mapping test would still pass — only this catches it.
describe("weddingPartyRenderers registry wiring", () => {
  it("maps couture-polaroid to the CouturePolaroidWeddingParty component", () => {
    expect(weddingPartyRenderers["couture-polaroid"]).toBe(CouturePolaroidWeddingParty);
  });

  it("maps gilded-frames to GildedFramesWeddingParty (guards against a swap)", () => {
    expect(weddingPartyRenderers["gilded-frames"]).toBe(GildedFramesWeddingParty);
  });
});
