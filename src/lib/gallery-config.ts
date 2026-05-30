/**
 * Limits and configuration for the post-event gallery feature.
 *
 * These constants are MVP-temporary. Pre-GA they'll be replaced with a
 * per-plan resolver (resolveGalleryLimits) that returns per-event caps based
 * on the organizer's plan — see the premium-tier-caps note in launch planning.
 * Don't bump these numbers further; build the resolver instead.
 *
 * See docs/pending-features/post-event-gallery/CONSOLIDATED-IMPLEMENTATION-PLAN.md §6.
 */
export const GALLERY_LIMITS = {
  /** Max imported images per gallery. */
  maxImagesPerGallery: 50,
  /** Max original file size accepted from any provider, in bytes. */
  maxImageBytes: 10 * 1024 * 1024,
  /** Max import sessions per event per UTC day. */
  maxImportsPerEventPerDay: 3,
  /** Concurrent active jobs per event. New selection submits are blocked above this. */
  maxConcurrentJobsPerEvent: 1,
  /** MIME types the worker will process. HEIC is intentionally excluded for MVP. */
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  /** Items claimed by a single cron invocation. */
  workerBatchSize: 10,
  /** Cap on automatic retries before an item is left as FAILED. */
  workerMaxAttempts: 3,
  /** Items in IMPORTING older than this are re-claimable by the worker. */
  staleImportingThresholdMs: 10 * 60_000,
} as const;

/**
 * Storage spec for the post-event `gallery` bucket — the single source of
 * truth shared by two consumers that must agree:
 *   1. the worker's self-heal create call (`ensureBucket` in gallery-worker.ts), and
 *   2. the local declarative bucket in `supabase/config.toml`
 *      `[storage.buckets.gallery]`.
 * Nothing syncs those at runtime, so `tests/unit/gallery-bucket-spec.test.ts`
 * asserts parity and fails the build if this and the config.toml block drift.
 * `allowedMimeTypes` is intentionally the same set the worker accepts — keep
 * them unified rather than declaring a second list.
 */
export const GALLERY_BUCKET_SPEC = {
  public: true,
  /** Matches config.toml `file_size_limit = "50MiB"` (50 × 1024 × 1024 bytes). */
  fileSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: GALLERY_LIMITS.allowedMimeTypes,
} as const;

export type GalleryLimits = typeof GALLERY_LIMITS;
export type AllowedGalleryMimeType = (typeof GALLERY_LIMITS.allowedMimeTypes)[number];
