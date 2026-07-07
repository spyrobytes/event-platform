import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { optimizeImage } from "@/lib/media-validation";
import {
  IMAGE_CONSTRAINTS,
  HERO_DISPLAY_MAX_DIMENSION,
} from "@/schemas/media-asset";

/**
 * Guards the ingestion-time sizing contract (Tier 2, phase 2a). Uses REAL sharp
 * (no mock) on generated solid-color images.
 */
async function makeImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 120, b: 140 },
    },
  })
    .png()
    .toBuffer();
}

describe("optimizeImage", () => {
  it("downscales a HERO-sized cap (2048) on the long edge", async () => {
    const out = await optimizeImage(await makeImage(3000, 2000), {
      maxWidth: HERO_DISPLAY_MAX_DIMENSION,
      maxHeight: HERO_DISPLAY_MAX_DIMENSION,
    });
    expect(out.width).toBe(HERO_DISPLAY_MAX_DIMENSION);
    expect(out.format).toBe("webp");
  });

  it("does not enlarge images already smaller than the cap", async () => {
    const out = await optimizeImage(await makeImage(800, 600), {
      maxWidth: HERO_DISPLAY_MAX_DIMENSION,
      maxHeight: HERO_DISPLAY_MAX_DIMENSION,
    });
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
  });

  it("defaults to the 4000px ceiling when no cap is given (gallery path)", async () => {
    const out = await optimizeImage(await makeImage(5000, 3000));
    expect(out.width).toBe(IMAGE_CONSTRAINTS.maxDimensions.width);
  });
});

describe("optimizeImage — EXIF orientation", () => {
  // A "portrait phone photo": stored landscape 200x100 with orientation 6
  // (rotate 90° CW to display), i.e. displays as 100x200 portrait.
  async function makeOrientedImage(): Promise<Buffer> {
    return sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .jpeg({ quality: 95 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
  }

  it("default (template pipeline): preserves the orientation tag and sensor dims — byte-contract unchanged", async () => {
    const out = await optimizeImage(await makeOrientedImage());
    expect({ w: out.width, h: out.height }).toEqual({ w: 200, h: 100 });
    const meta = await sharp(out.buffer).metadata();
    // The tag rides along so browsers display the photo correctly rotated.
    expect(meta.orientation).toBe(6);
  });

  it("autoOrient (gallery pipeline): bakes rotation into pixels, drops the tag, reports display dims", async () => {
    const out = await optimizeImage(await makeOrientedImage(), {
      autoOrient: true,
    });
    expect({ w: out.width, h: out.height }).toEqual({ w: 100, h: 200 });
    const meta = await sharp(out.buffer).metadata();
    // After baking, sharp normalizes the tag to 1 ("upright") — either 1 or
    // absent means no further rotation is applied at display time.
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("autoOrient is a no-op for untagged images", async () => {
    const out = await optimizeImage(await makeImage(800, 600), {
      autoOrient: true,
    });
    expect({ w: out.width, h: out.height }).toEqual({ w: 800, h: 600 });
  });
});
