import { describe, it, expect } from "vitest";
import {
  RENDITION_MARKER,
  insertRenditionWidth,
  withRenditionWidths,
  resolveRenditionUrl,
} from "@/lib/images/rendition";

const ORIGIN = "https://x.supabase.co/storage/v1/object/public/event-assets/e/1/123.webp";

describe("insertRenditionWidth", () => {
  it("inserts _w{width} before the .webp extension", () => {
    expect(insertRenditionWidth(ORIGIN, 640)).toBe(
      "https://x.supabase.co/storage/v1/object/public/event-assets/e/1/123_w640.webp"
    );
  });

  it("only touches the trailing extension", () => {
    expect(insertRenditionWidth("a.b/c.webp", 384)).toBe("a.b/c_w384.webp");
  });
});

describe("withRenditionWidths", () => {
  it("returns the base unchanged when there are no widths", () => {
    expect(withRenditionWidths(ORIGIN, [])).toBe(ORIGIN);
  });

  it("appends the marker with comma-joined widths", () => {
    expect(withRenditionWidths(ORIGIN, [384, 640, 828, 1200])).toBe(
      `${ORIGIN}${RENDITION_MARKER}384,640,828,1200`
    );
  });
});

describe("resolveRenditionUrl", () => {
  it("passes through a src with no marker (original / external)", () => {
    expect(resolveRenditionUrl(ORIGIN, 640)).toBe(ORIGIN);
    expect(resolveRenditionUrl("https://other.com/a.jpg", 800)).toBe(
      "https://other.com/a.jpg"
    );
  });

  it("falls back to the original when the marker carries no widths", () => {
    expect(resolveRenditionUrl(`${ORIGIN}${RENDITION_MARKER}`, 640)).toBe(ORIGIN);
  });

  const decorated = withRenditionWidths(ORIGIN, [384, 640, 828, 1200]);

  it("picks the exact rung when the requested width matches", () => {
    expect(resolveRenditionUrl(decorated, 640)).toBe(insertRenditionWidth(ORIGIN, 640));
  });

  it("rounds up to the next rung for an in-between width", () => {
    expect(resolveRenditionUrl(decorated, 750)).toBe(insertRenditionWidth(ORIGIN, 828));
  });

  it("uses the smallest rung for tiny widths", () => {
    expect(resolveRenditionUrl(decorated, 16)).toBe(insertRenditionWidth(ORIGIN, 384));
  });

  it("returns the original when the request exceeds every rendition", () => {
    expect(resolveRenditionUrl(decorated, 1920)).toBe(ORIGIN);
    expect(resolveRenditionUrl(decorated, 3840)).toBe(ORIGIN);
  });

  it("maps the full next/image width set onto the ladder + original", () => {
    const widths = [16, 64, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
    const got = widths.map((w) => resolveRenditionUrl(decorated, w));
    expect(got).toEqual([
      insertRenditionWidth(ORIGIN, 384), // 16
      insertRenditionWidth(ORIGIN, 384), // 64
      insertRenditionWidth(ORIGIN, 384), // 384
      insertRenditionWidth(ORIGIN, 640), // 640
      insertRenditionWidth(ORIGIN, 828), // 750
      insertRenditionWidth(ORIGIN, 828), // 828
      insertRenditionWidth(ORIGIN, 1200), // 1080
      insertRenditionWidth(ORIGIN, 1200), // 1200
      ORIGIN, // 1920
      ORIGIN, // 2048
      ORIGIN, // 3840
    ]);
  });

  it("never emits the /render/image/ transform endpoint", () => {
    for (const w of [16, 640, 3840]) {
      expect(resolveRenditionUrl(decorated, w)).not.toContain("/render/image/");
    }
  });
});
