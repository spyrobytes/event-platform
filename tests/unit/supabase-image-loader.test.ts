import { describe, it, expect } from "vitest";
import supabaseImageLoader from "@/lib/images/supabase-loader";

/**
 * The loader MUST stay a passthrough: it must never rewrite to Supabase's
 * `/render/image/` transform endpoint, which consumes per-origin-image
 * transformation quota (100/cycle on Pro) and is disabled by the spend cap
 * once exceeded. Regression guard for that.
 */
describe("supabaseImageLoader", () => {
  const objectUrl =
    "https://abc.supabase.co/storage/v1/object/public/event-assets/e/123/cover.webp";

  it("returns a public object URL unchanged", () => {
    expect(supabaseImageLoader({ src: objectUrl, width: 640, quality: 75 })).toBe(
      objectUrl
    );
  });

  it("never rewrites to the /render/image/ transform endpoint", () => {
    for (const width of [16, 320, 640, 1080, 1920, 3840]) {
      const out = supabaseImageLoader({ src: objectUrl, width, quality: 80 });
      expect(out).not.toContain("/render/image/");
    }
  });

  it("returns the same URL at every width (no per-width transform)", () => {
    const widths = [320, 640, 1080, 1920];
    const outputs = widths.map((width) => supabaseImageLoader({ src: objectUrl, width }));
    expect(new Set(outputs).size).toBe(1);
  });

  it("passes non-Supabase URLs through untouched", () => {
    const external = "https://images.example.com/photo.jpg";
    expect(supabaseImageLoader({ src: external, width: 800 })).toBe(external);
  });
});
