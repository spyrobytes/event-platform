import sharp from "sharp";

/**
 * Synthesizes a "phone photo as stored" test fixture: encoded (sensor) pixels
 * of the given size carrying an EXIF orientation tag. Orientations 5-8 are
 * the transposed 90° family (displayed axes swap); 2-4 are flips/180° (no
 * swap). Shared by the optimize-image and generate-renditions suites so the
 * EXIF-simulation approach can't drift between them.
 */
export async function makeOrientedImage(
  sensorW: number,
  sensorH: number,
  orientation: number,
  format: "webp" | "jpeg" = "webp",
): Promise<Buffer> {
  const base = sharp({
    create: {
      width: sensorW,
      height: sensorH,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  });
  const encoded = format === "jpeg" ? base.jpeg({ quality: 95 }) : base.webp();
  return encoded.withMetadata({ orientation }).toBuffer();
}
