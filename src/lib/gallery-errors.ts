/**
 * Worker error-code vocabulary for `event_gallery_items.error_code` and
 * `gallery_import_jobs.error_code`. Stored as plain strings so the DB
 * doesn't need an enum migration every time we add a code; the union
 * type below is the source of truth at the app layer.
 *
 * Permanent vs transient classification drives whether the worker
 * auto-retries (transient stays PENDING until workerMaxAttempts, then
 * FAILED) or marks terminally FAILED on the first hit.
 */

export const GALLERY_ERROR_CODES = {
  SOURCE_PERMISSION_DENIED: "SOURCE_PERMISSION_DENIED",
  SOURCE_FILE_NOT_FOUND: "SOURCE_FILE_NOT_FOUND",
  SOURCE_DOWNLOAD_FAILED: "SOURCE_DOWNLOAD_FAILED",
  UNSUPPORTED_MIME_TYPE: "UNSUPPORTED_MIME_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  IMAGE_PROCESSING_FAILED: "IMAGE_PROCESSING_FAILED",
  STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type GalleryErrorCode =
  (typeof GALLERY_ERROR_CODES)[keyof typeof GALLERY_ERROR_CODES];

/** Codes that are terminal on first hit (no auto-retry). */
export const PERMANENT_ERROR_CODES: ReadonlySet<GalleryErrorCode> = new Set([
  "SOURCE_FILE_NOT_FOUND",
  "UNSUPPORTED_MIME_TYPE",
  "FILE_TOO_LARGE",
  "RECONNECT_REQUIRED",
]);

export function isPermanent(code: GalleryErrorCode): boolean {
  return PERMANENT_ERROR_CODES.has(code);
}

/**
 * Human-readable copy for organizer-facing surfaces (review/recovery UX
 * in PR #7). Worker writes these into `error_message`; dashboards can
 * also re-derive from `error_code` if they want.
 */
export const GALLERY_ERROR_MESSAGES: Record<GalleryErrorCode, string> = {
  SOURCE_PERMISSION_DENIED: "Access was denied for this photo.",
  SOURCE_FILE_NOT_FOUND: "This photo was deleted or moved in Google Drive.",
  SOURCE_DOWNLOAD_FAILED: "We couldn't download this photo. We'll try again.",
  UNSUPPORTED_MIME_TYPE:
    "This file type isn't supported. Re-save as JPEG, PNG, or WebP.",
  FILE_TOO_LARGE: "This photo is larger than the 10 MB import limit.",
  IMAGE_PROCESSING_FAILED: "We couldn't process this photo. Please try again.",
  STORAGE_UPLOAD_FAILED: "We couldn't save this photo. We'll try again.",
  RECONNECT_REQUIRED:
    "Reconnect Google Drive — your authorization has expired.",
  UNKNOWN_ERROR: "Something went wrong processing this photo.",
};
