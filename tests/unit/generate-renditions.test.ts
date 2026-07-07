import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { generateRenditions } from "@/lib/media-validation";
import { RESPONSIVE_RENDITION_WIDTHS } from "@/schemas/media-asset";
import { makeOrientedImage } from "./helpers/oriented-image";

/**
 * Tier 2 (issue #211). Real sharp (no mock) on generated images.
 */
async function makeImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .webp()
    .toBuffer();
}

describe("generateRenditions", () => {
  it("produces a webp rendition for each ladder width strictly below the source", async () => {
    // Gallery-sized source (> the 2048 top rung) so the full ladder generates.
    const out = await generateRenditions(
      await makeImage(4096, 2731),
      RESPONSIVE_RENDITION_WIDTHS
    );

    expect(out.map((r) => r.width)).toEqual([...RESPONSIVE_RENDITION_WIDTHS]);

    // The reported width must match what's actually encoded in the buffer, so
    // the filename ({timestamp}_w{width}.webp) the loader reconstructs is real.
    for (const r of out) {
      const meta = await sharp(r.buffer).metadata();
      expect(meta.width).toBe(r.width);
      expect(meta.format).toBe("webp");
    }
  });

  it("does not generate the 2048 mid-rung for a HERO-capped (2048px) source", async () => {
    const out = await generateRenditions(
      await makeImage(2048, 1365),
      RESPONSIVE_RENDITION_WIDTHS
    );
    // 2048 is not strictly smaller than the 2048px source, so the mid-rung is a
    // no-op for HERO covers (capped at HERO_DISPLAY_MAX_DIMENSION). Galleries
    // (≤4000) are the only kind that actually gets it.
    expect(out.map((r) => r.width)).toEqual([384, 640, 828, 1200]);
  });

  it("skips widths >= source width (never upscales)", async () => {
    const out = await generateRenditions(
      await makeImage(800, 600),
      RESPONSIVE_RENDITION_WIDTHS
    );
    expect(out.map((r) => r.width)).toEqual([384, 640]);
  });

  it("returns nothing when the source is smaller than every rung", async () => {
    const out = await generateRenditions(
      await makeImage(300, 300),
      RESPONSIVE_RENDITION_WIDTHS
    );
    expect(out).toEqual([]);
  });
});

describe("generateRenditions — EXIF orientation", () => {
  it("bakes the rotation into rungs: upright dimensions, no orientation tag", async () => {
    // Sensor 1000x2000 + orientation 6 → displays 2000 wide × 1000 tall.
    const out = await generateRenditions(
      await makeOrientedImage(1000, 2000, 6),
      [640]
    );
    expect(out).toHaveLength(1);
    expect(out[0].width).toBe(640);
    const meta = await sharp(out[0].buffer).metadata();
    // 2000x1000 display → 640 wide is 320 tall; tag baked away (absent or 1).
    expect(meta.height).toBe(320);
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("filters rung widths against the DISPLAY width, not the sensor width", async () => {
    // Sensor 2000x1000 + orientation 6 → displays 1000 wide. A 1200 rung must
    // be skipped (would upscale the displayed image) even though the sensor
    // width (2000) exceeds it.
    const out = await generateRenditions(
      await makeOrientedImage(2000, 1000, 6),
      [640, 1200]
    );
    expect(out.map((r) => r.width)).toEqual([640]);
  });

  it("handles orientation 8 (the other 90° direction) identically", async () => {
    const out = await generateRenditions(
      await makeOrientedImage(1000, 2000, 8),
      [640]
    );
    expect(out).toHaveLength(1);
    const meta = await sharp(out[0].buffer).metadata();
    expect(meta.height).toBe(320); // display 2000x1000 → 640x320
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("does NOT swap axes for the flip/180 family (orientation 3) but still bakes it", async () => {
    // 180° rotation: displayed axes = sensor axes. A 1200 rung is valid for
    // the 2000-wide display; output aspect matches the sensor shape.
    const out = await generateRenditions(
      await makeOrientedImage(2000, 1000, 3),
      [1200]
    );
    expect(out).toHaveLength(1);
    const meta = await sharp(out[0].buffer).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(600);
    expect(meta.orientation ?? 1).toBe(1);
  });
});
