import { describe, it, expect } from "vitest";
import { getRenditionPath } from "@/lib/supabase-storage";

/**
 * getRenditionPath is the single source of truth for the rendition naming
 * convention, used by both ingestion (upload) and deletion (cleanup). If these
 * ever disagree, deletes orphan rendition files. See issue #211 (Tier 2).
 */
describe("getRenditionPath", () => {
  it("inserts _w{width} before the .webp extension", () => {
    expect(getRenditionPath("evt_1/hero/1700000000000.webp", 640)).toBe(
      "evt_1/hero/1700000000000_w640.webp"
    );
  });

  it("only rewrites the trailing extension, not other dots in the path", () => {
    expect(getRenditionPath("e.v/hero/123.webp", 1200)).toBe(
      "e.v/hero/123_w1200.webp"
    );
  });

  it("is case-insensitive on the extension", () => {
    expect(getRenditionPath("a/b/c.WEBP", 384)).toBe("a/b/c_w384.webp");
  });
});
