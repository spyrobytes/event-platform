import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { optimizeImage } from "@/lib/media-validation";
import { makeOrientedImage } from "./helpers/oriented-image";
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
  // "Portrait phone photo": stored landscape 200x100 with orientation 6
  // (rotate 90° CW to display), i.e. displays as 100x200 portrait.

  it("default (template pipeline): preserves the tag in the buffer, reports DISPLAY dims", async () => {
    const out = await optimizeImage(await makeOrientedImage(200, 100, 6, "jpeg"));
    // Reported dims are the rendered shape — srcset originalWidth, intrinsic
    // next/image boxes, and aspect math all consume these. The BUFFER still
    // carries the tag (byte-contract unchanged): browsers rotate at display.
    expect({ w: out.width, h: out.height }).toEqual({ w: 100, h: 200 });
    const meta = await sharp(out.buffer).metadata();
    expect(meta.orientation).toBe(6);
    // Encoded pixels remain sensor-axis; only the REPORT is display-axis.
    expect({ w: meta.width, h: meta.height }).toEqual({ w: 200, h: 100 });
  });

  it("default path does not swap dims for the flip/180 family (orientation 3)", async () => {
    const out = await optimizeImage(await makeOrientedImage(200, 100, 3, "jpeg"));
    expect({ w: out.width, h: out.height }).toEqual({ w: 200, h: 100 });
    const meta = await sharp(out.buffer).metadata();
    expect(meta.orientation).toBe(3);
  });

  it("autoOrient (gallery pipeline): bakes rotation into pixels, drops the tag, reports display dims", async () => {
    const out = await optimizeImage(await makeOrientedImage(200, 100, 6, "jpeg"), {
      autoOrient: true,
    });
    expect({ w: out.width, h: out.height }).toEqual({ w: 100, h: 200 });
    const meta = await sharp(out.buffer).metadata();
    // After baking, sharp normalizes the tag to 1 ("upright") — either 1 or
    // absent means no further rotation is applied at display time.
    expect(meta.orientation ?? 1).toBe(1);
    // Baked: encoded pixels ARE the display shape.
    expect({ w: meta.width, h: meta.height }).toEqual({ w: 100, h: 200 });
  });

  it("autoOrient is a no-op for untagged images", async () => {
    const out = await optimizeImage(await makeImage(800, 600), {
      autoOrient: true,
    });
    expect({ w: out.width, h: out.height }).toEqual({ w: 800, h: 600 });
  });
});
