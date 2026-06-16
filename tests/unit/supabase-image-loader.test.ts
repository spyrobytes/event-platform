import { describe, it, expect, afterEach, vi } from "vitest";
import supabaseImageLoader from "@/lib/images/supabase-loader";
import { withRenditionWidths, insertRenditionWidth } from "@/lib/images/rendition";

/**
 * The loader must NEVER rewrite to Supabase's `/render/image/` transform
 * endpoint (which consumes per-origin-image transformation quota — 100/cycle on
 * Pro — and is disabled by the spend cap once exceeded). It selects a stored
 * rendition only for a `?rw=`-decorated src; every other src is passed through
 * byte-for-byte.
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

  // Undecorated input shapes (no ?rw= marker) the loader must pass through.
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

  it("passes every undecorated input through byte-for-byte at every width", () => {
    for (const src of inputs) {
      for (const width of widths) {
        expect(supabaseImageLoader({ src, width, quality: 75 })).toBe(src);
      }
    }
  });

  it("never emits the /render/image/ transform endpoint", () => {
    const objectUrl = inputs[0];
    const decorated = withRenditionWidths(objectUrl, [384, 640, 828, 1200]);
    for (const width of widths) {
      expect(supabaseImageLoader({ src: objectUrl, width })).not.toContain(
        "/render/image/"
      );
      expect(supabaseImageLoader({ src: decorated, width })).not.toContain(
        "/render/image/"
      );
    }
  });

  it("selects the nearest stored rendition for a ?rw=-decorated src", () => {
    const objectUrl = inputs[0];
    const decorated = withRenditionWidths(objectUrl, [384, 640, 828, 1200]);
    expect(supabaseImageLoader({ src: decorated, width: 640 })).toBe(
      insertRenditionWidth(objectUrl, 640)
    );
    expect(supabaseImageLoader({ src: decorated, width: 750 })).toBe(
      insertRenditionWidth(objectUrl, 828)
    );
    // Above every rendition → the original (the marker is stripped).
    expect(supabaseImageLoader({ src: decorated, width: 3840 })).toBe(objectUrl);
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
