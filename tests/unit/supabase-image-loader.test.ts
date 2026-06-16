import { describe, it, expect, afterEach, vi } from "vitest";
import supabaseImageLoader from "@/lib/images/supabase-loader";

/**
 * The loader MUST stay a passthrough: it returns `src` byte-for-byte and must
 * NEVER rewrite to Supabase's `/render/image/` transform endpoint (which
 * consumes per-origin-image transformation quota — 100/cycle on Pro — and is
 * disabled by the spend cap once exceeded).
 *
 * IMPORTANT: the original loader had a `process.env.NODE_ENV === "production"`-
 * gated transform branch that was deliberately removed. Do NOT reintroduce any
 * environment-conditional transform. The NODE_ENV-matrix test below guards
 * against a prod-only regression that would otherwise be invisible because the
 * suite runs under NODE_ENV=test.
 */
describe("supabaseImageLoader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // A spread of input shapes the loader must pass through untouched.
  const inputs = [
    "https://abc.supabase.co/storage/v1/object/public/event-assets/e/123/cover.webp",
    "https://abc.supabase.co/storage/v1/object/sign/gallery/x.webp?token=ab.cd", // signed URL w/ query
    "https://images.example.com/photo.jpg", // external host
    "/brand/logo.png", // relative path
    "data:image/webp;base64,UklGRg==", // data URI (blur placeholder)
  ];

  // Cover the full default next/image width range, including >= 1920, so a
  // width-gated transform (e.g. "only resize large widths") can't slip through.
  const widths = [16, 64, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

  it("returns src byte-for-byte for every input at every width", () => {
    for (const src of inputs) {
      for (const width of widths) {
        expect(supabaseImageLoader({ src, width, quality: 75 })).toBe(src);
      }
    }
  });

  it("never transforms a public object URL — exact passthrough, no query, no render endpoint", () => {
    const objectUrl = inputs[0];
    for (const width of widths) {
      const out = supabaseImageLoader({ src: objectUrl, width });
      // Exact equality catches any mutation, including an appended `?width=`
      // query on the same /object/public/ path (which a substring check misses).
      expect(out).toBe(objectUrl);
      expect(out).not.toContain("/render/image/");
    }
  });

  it("behaves identically regardless of NODE_ENV (no prod-only transform branch)", () => {
    const objectUrl = inputs[0];
    for (const env of ["development", "production", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      expect(supabaseImageLoader({ src: objectUrl, width: 1920, quality: 80 })).toBe(
        objectUrl
      );
    }
  });
});
