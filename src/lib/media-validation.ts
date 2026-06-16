import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import {
  ALLOWED_MIME_TYPES,
  IMAGE_CONSTRAINTS,
  type ImageValidationResult,
} from "@/schemas/media-asset";

/**
 * Validates an uploaded image buffer
 *
 * Performs the following checks:
 * 1. File size (max 5MB)
 * 2. MIME type verification (not just extension)
 * 3. Image dimensions (min/max)
 * 4. Image integrity (can be processed)
 */
export async function validateUploadedImage(
  buffer: Buffer
): Promise<ImageValidationResult> {
  // 1. Check file size
  if (buffer.length > IMAGE_CONSTRAINTS.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${IMAGE_CONSTRAINTS.maxFileSize / 1024 / 1024}MB limit`,
    };
  }

  // 2. Verify actual MIME type (not just extension)
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: `Invalid file type. Only JPEG, PNG, and WebP are allowed`,
    };
  }

  // 3. Validate image dimensions and integrity
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        error: "Could not determine image dimensions",
      };
    }

    const { maxDimensions, minDimensions } = IMAGE_CONSTRAINTS;

    if (
      metadata.width > maxDimensions.width ||
      metadata.height > maxDimensions.height
    ) {
      return {
        valid: false,
        error: `Image dimensions exceed maximum ${maxDimensions.width}x${maxDimensions.height}px`,
      };
    }

    if (
      metadata.width < minDimensions.width ||
      metadata.height < minDimensions.height
    ) {
      return {
        valid: false,
        error: `Image dimensions below minimum ${minDimensions.width}x${minDimensions.height}px`,
      };
    }

    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || "unknown",
        mimeType: fileType.mime,
      },
    };
  } catch {
    return {
      valid: false,
      error: "Invalid or corrupted image file",
    };
  }
}

/**
 * Optimizes an image for storage
 * - Converts to WebP for better compression
 * - Resizes if larger than max dimensions
 * - Strips metadata for privacy
 */
export async function optimizeImage(
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<{ buffer: Buffer; width: number; height: number; format: string }> {
  const {
    maxWidth = IMAGE_CONSTRAINTS.maxDimensions.width,
    maxHeight = IMAGE_CONSTRAINTS.maxDimensions.height,
    quality = 85,
  } = options;

  const image = sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .withMetadata({ orientation: undefined }); // Strip metadata but preserve orientation

  const optimizedBuffer = await image.toBuffer();
  const metadata = await sharp(optimizedBuffer).metadata();

  return {
    buffer: optimizedBuffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: "webp",
  };
}

/**
 * Generates a thumbnail for an image
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 300
): Promise<Buffer> {
  return sharp(buffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Generates responsive WebP renditions from a source image buffer.
 *
 * Produces one rendition per requested width that is strictly smaller than the
 * source width (no upscaling — a larger requested width is skipped because the
 * stored original already serves it). Returns the actual encoded width of each
 * rendition (sharp may differ by a pixel after aspect-ratio rounding), so
 * callers persist exactly what was produced.
 *
 * Widths are matched against the source's intrinsic width, so callers should
 * pass the ORIGINAL (pre-optimize) buffer for best quality. See issue #211.
 */
export async function generateRenditions(
  buffer: Buffer,
  widths: readonly number[],
  quality = 80
): Promise<Array<{ width: number; buffer: Buffer }>> {
  const sourceWidth = (await sharp(buffer).metadata()).width ?? 0;

  const renditions = await Promise.all(
    widths
      .filter((w) => w < sourceWidth)
      .map(async (w) => {
        const out = await sharp(buffer)
          .resize(w, undefined, { fit: "inside", withoutEnlargement: true })
          .webp({ quality })
          .toBuffer({ resolveWithObject: true });
        return { width: out.info.width, buffer: out.data };
      })
  );

  return renditions;
}

/**
 * Generates a tiny blur placeholder (data URI) for use with next/image placeholder="blur".
 * Resizes to ~10px wide and encodes as base64 WebP.
 */
export async function generateBlurDataUrl(buffer: Buffer): Promise<string> {
  const tiny = await sharp(buffer)
    .resize(10, undefined, { fit: "inside" })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${tiny.toString("base64")}`;
}

/**
 * Gets basic image info without full validation
 * Useful for quick checks
 */
export async function getImageInfo(
  buffer: Buffer
): Promise<{ width: number; height: number; format: string } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) {
      return null;
    }
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch {
    return null;
  }
}
