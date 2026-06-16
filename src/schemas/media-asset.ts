import { z } from "zod";
import { PAGE_CONFIG_LIMITS } from "./event-page";

// =============================================================================
// MEDIA ASSET VALIDATION
// =============================================================================

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const IMAGE_CONSTRAINTS = {
  maxFileSize: PAGE_CONFIG_LIMITS.maxFileSizeBytes,
  maxDimensions: { width: 4000, height: 4000 },
  minDimensions: { width: 200, height: 200 },
  maxAssetsPerEvent: PAGE_CONFIG_LIMITS.maxAssetsPerEvent,
} as const;

/**
 * Stored-dimension cap for HERO covers. These are display-only (no lightbox
 * zoom), so we downscale them to a sane web maximum at ingestion instead of the
 * 4000px validation ceiling — serving the full original to every device is pure
 * bandwidth waste now that the image loader is a passthrough (no on-the-fly
 * resizing). Galleries keep the 4000px ceiling for lightbox zoom.
 * See issue #211 (Tier 2, phase 2a).
 */
export const HERO_DISPLAY_MAX_DIMENSION = 2048;

/**
 * Responsive rendition ladder (widths in px), aligned to next/image defaults.
 * At ingestion we store a WebP at each of these widths that is strictly smaller
 * than the optimized original (no upscaling); the original (HERO ≤ 2048,
 * gallery ≤ 4000) serves the top of the ladder. The image loader maps a
 * requested width to the nearest stored rendition. See issue #211 (Tier 2).
 */
export const RESPONSIVE_RENDITION_WIDTHS = [384, 640, 828, 1200] as const;

export const mimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);
export type AllowedMimeType = z.infer<typeof mimeTypeSchema>;

/**
 * Schema for requesting a signed upload URL
 */
export const requestUploadUrlSchema = z.object({
  eventId: z.string().cuid(),
  filename: z.string().min(1).max(255),
  mimeType: mimeTypeSchema,
  size: z
    .number()
    .int()
    .positive()
    .max(IMAGE_CONSTRAINTS.maxFileSize, `File size must be ${IMAGE_CONSTRAINTS.maxFileSize / 1024 / 1024}MB or less`),
  alt: z.string().min(1, "Alt text is required for accessibility").max(500),
});

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;

/**
 * Schema for confirming an upload completion
 */
export const confirmUploadSchema = z.object({
  eventId: z.string().cuid(),
  path: z.string().min(1),
  mimeType: mimeTypeSchema,
  size: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1).max(500),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

/**
 * Schema for direct upload (when uploading through server)
 */
export const directUploadSchema = z.object({
  eventId: z.string().cuid(),
  alt: z.string().min(1, "Alt text is required for accessibility").max(500),
});

export type DirectUploadInput = z.infer<typeof directUploadSchema>;

/**
 * Schema for deleting an asset
 */
export const deleteAssetSchema = z.object({
  assetId: z.string().cuid(),
});

export type DeleteAssetInput = z.infer<typeof deleteAssetSchema>;

/**
 * Schema for listing assets
 */
export const listAssetsSchema = z.object({
  eventId: z.string().cuid(),
  kind: z.enum(["UPLOAD", "GALLERY"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAssetsInput = z.infer<typeof listAssetsSchema>;

/**
 * Validation result for image metadata
 */
export type ImageValidationResult =
  | {
      valid: true;
      metadata: {
        width: number;
        height: number;
        format: string;
        mimeType: string;
      };
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Validates image dimensions against constraints
 */
export function validateImageDimensions(
  width: number,
  height: number
): { valid: true } | { valid: false; error: string } {
  const { maxDimensions, minDimensions } = IMAGE_CONSTRAINTS;

  if (width > maxDimensions.width || height > maxDimensions.height) {
    return {
      valid: false,
      error: `Image dimensions exceed maximum ${maxDimensions.width}x${maxDimensions.height}px`,
    };
  }

  if (width < minDimensions.width || height < minDimensions.height) {
    return {
      valid: false,
      error: `Image dimensions below minimum ${minDimensions.width}x${minDimensions.height}px`,
    };
  }

  return { valid: true };
}

/**
 * Validates file size against constraint
 */
export function validateFileSize(
  sizeBytes: number
): { valid: true } | { valid: false; error: string } {
  if (sizeBytes > IMAGE_CONSTRAINTS.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${IMAGE_CONSTRAINTS.maxFileSize / 1024 / 1024}MB limit`,
    };
  }
  return { valid: true };
}

/**
 * Validates MIME type
 */
export function validateMimeType(
  mimeType: string
): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }
  return { valid: true };
}
