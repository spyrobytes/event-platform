import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { generateRenditions } from "@/lib/media-validation";
import { RESPONSIVE_RENDITION_WIDTHS } from "@/schemas/media-asset";

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
    const out = await generateRenditions(
      await makeImage(2000, 1333),
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
