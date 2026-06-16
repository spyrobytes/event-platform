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
