import { describe, it, expect, vi } from "vitest";

// The renderers barrel transitively imports next/font/google fonts, which are
// invoked at module load and are not functions under jsdom. Stub them via the
// shared mock (new fonts get added there, once).
vi.mock("next/font/google", () => import("./helpers/next-font-google-mock"));

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
