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
 * 1. File size (max = PAGE_CONFIG_LIMITS.maxFileSizeBytes — sized to Vercel's 4.5MB function-body cap)
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
/**
 * Displayed (post-EXIF-rotation) dimensions. Orientations 5-8 are the
 * transposed 90° family: the rendered axes are swapped relative to the
 * encoded pixels. Single source of truth for the axis-swap rule — the
 * rendition ladder, stored MediaAsset dims, and srcset width descriptors
 * must all live on the DISPLAY axis or they disagree for rotated photos
 * (mislabeled/dropped srcset originals, squished intrinsic boxes).
 */
export function displayDimensions(meta: {
  width?: number;
  height?: number;
  orientation?: number;
}): { width: number; height: number } {
  const rotated90 = (meta.orientation ?? 1) >= 5;
  return {
    width: (rotated90 ? meta.height : meta.width) ?? 0,
    height: (rotated90 ? meta.width : meta.height) ?? 0,
  };
}

export async function optimizeImage(
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    /** Bake EXIF orientation into the pixels (and drop the tag) instead of
     *  carrying the tag through. The default (false) preserves the tag so the
     *  stored file still displays upright — the output BUFFER is byte-identical
     *  to the historical behavior. Reported width/height are the DISPLAY
     *  dimensions in both modes (see displayDimensions). */
    autoOrient?: boolean;
  } = {}
): Promise<{ buffer: Buffer; width: number; height: number; format: string }> {
  const {
    maxWidth = IMAGE_CONSTRAINTS.maxDimensions.width,
    maxHeight = IMAGE_CONSTRAINTS.maxDimensions.height,
    quality = 85,
    autoOrient = false,
  } = options;

  // .rotate() with no args = auto-orient from EXIF and clear the tag; it must
  // run BEFORE resize so fit is computed against display-orientation pixels.
  const source = autoOrient ? sharp(buffer).rotate() : sharp(buffer);
  const image = source
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .withMetadata({ orientation: undefined }); // Strip metadata but preserve orientation

  const optimizedBuffer = await image.toBuffer();
  const metadata = await sharp(optimizedBuffer).metadata();

  // Report DISPLAY dimensions in both modes. With autoOrient the pixels are
  // baked (tag gone → no swap needed); on the default tag-preserving path the
  // output still carries the orientation tag, so the rendered axes are
  // swapped for orientations 5-8. Consumers (srcset originalWidth, intrinsic
  // next/image boxes, aspect math) all need the rendered shape — reporting
  // sensor dims here is what made rotated portraits drop/mislabel their
  // srcset original and squish in fixed-dims lightboxes.
  const { width, height } = displayDimensions(metadata);
  return {
    buffer: optimizedBuffer,
    width,
    height,
    format: "webp",
  };
}

/**
 * Generates responsive WebP renditions from a source image buffer.
 *
 * Produces one rendition per requested width that is strictly smaller than the
 * source width (no upscaling — a larger requested width is skipped because the
 * stored original already serves it). Returns the actual encoded width of each
 * rendition so callers persist exactly what was produced and can reconstruct
 * the stored filename.
 *
 * The media route passes the already-optimized (WebP, HERO-capped) buffer:
 * downscaling it is cheaper than re-decoding the raw upload and keeps the
 * ladder consistent with the stored original that serves the top. See #211.
 *
 * EXIF orientation is BAKED into every rung (`.rotate()`): the source buffer
 * may carry an orientation tag over unrotated pixels (optimizeImage's default
 * path preserves the tag for the browser to honor), but sharp strips metadata
 * on re-encode — an un-rotated rung would ship sideways pixels with no tag.
 * For an already-baked source the rotate is a no-op, so both input flavors
 * are safe. Width math likewise uses the DISPLAY orientation.
 */
export async function generateRenditions(
  buffer: Buffer,
  widths: readonly number[],
  quality = 80
): Promise<Array<{ width: number; buffer: Buffer }>> {
  const meta = await sharp(buffer).metadata();
  const sourceWidth = displayDimensions(meta).width;

  const renditions = await Promise.all(
    widths
      .filter((w) => w < sourceWidth)
      .map(async (w) => {
        const out = await sharp(buffer)
          .rotate()
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
