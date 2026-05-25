import sharp from "sharp";
import { db } from "@/lib/db";
import { GALLERY_LIMITS } from "@/lib/gallery-config";
import {
  GALLERY_ERROR_CODES,
  GALLERY_ERROR_MESSAGES,
  isPermanent,
  type GalleryErrorCode,
} from "@/lib/gallery-errors";
import {
  getValidAccessToken,
  ProviderTokenNotFoundError,
  ProviderTokenRevokedError,
} from "@/lib/provider-tokens";
import {
  downloadDriveFile,
  GoogleDriveDownloadError,
} from "@/lib/providers/google-drive";
import { BUCKETS, uploadFile } from "@/lib/supabase-storage";
import {
  generateBlurDataUrl,
  optimizeImage,
} from "@/lib/media-validation";
import type { Prisma } from "@prisma/client";

/**
 * Post-event gallery import worker.
 *
 * Triggered by /api/cron/process-gallery-imports every 5 min on Vercel
 * Cron. Each invocation:
 *   1. Atomically claims up to GALLERY_LIMITS.workerBatchSize items via
 *      `FOR UPDATE SKIP LOCKED` so concurrent ticks don't fight over the
 *      same rows.
 *   2. Processes each item: download from Drive → re-validate MIME via
 *      magic bytes (Picker mimeType is client-reported) → transcode to
 *      WebP + thumbnail + blur via Sharp → upload both to Supabase
 *      Storage → write storage URLs + dimensions back to the row.
 *   3. Reconciles the parent job's status from item-status counts.
 *
 * Idempotency: READY items are skipped (the claim WHERE clause filters
 * them out anyway). FAILED items only retry when the organizer explicitly
 * resets them to PENDING (PR #7's review/recovery UX). Stale IMPORTING
 * items (no progress in > staleImportingThresholdMs) are re-claimable so
 * a worker that died mid-process doesn't leave items stuck.
 *
 * Concurrency: each item lives for at most 60s within a cron invocation;
 * the Vercel function maxDuration is 60s so we cap workerBatchSize at 10
 * with a ~3-5s budget per item. The SKIP LOCKED claim means two cron
 * runs that overlap (rare but possible) take disjoint batches.
 */

const LARGE_IMAGE_PATH_SUFFIX = "large.webp";
const THUMBNAIL_PATH_SUFFIX = "thumb.webp";
const THUMBNAIL_DIMENSION = 400;

type ClaimedItem = {
  id: string;
  gallery_id: string;
  source_file_id: string | null;
  attempts: number;
};

type GalleryRow = {
  id: string;
  event_id: string;
};

type EventRow = {
  id: string;
  creator_id: string;
};

export type WorkerRunSummary = {
  claimed: number;
  ready: number;
  failed: number;
  skipped: number;
  jobsReconciled: number;
};

/**
 * Returns a snapshot of pending work for observability without running
 * any of it. Used by /api/cron/process-gallery-imports to short-circuit
 * when the queue is empty.
 */
export async function getPendingItemCount(): Promise<number> {
  const staleCutoff = new Date(
    Date.now() - GALLERY_LIMITS.staleImportingThresholdMs,
  );
  return db.eventGalleryItem.count({
    where: {
      OR: [
        { status: "PENDING" },
        { status: "IMPORTING", lockedAt: { lt: staleCutoff } },
      ],
    },
  });
}

/**
 * Claims up to N items in a single SQL statement. Marks them IMPORTING
 * with `locked_at = NOW()` and bumps `attempts` so capped retries are
 * counted even when the worker crashes mid-process.
 *
 * Returns the locked rows. Postgres `FOR UPDATE SKIP LOCKED` is the
 * canonical pattern for this — concurrent workers see disjoint sets.
 */
async function claimPendingItems(limit: number): Promise<ClaimedItem[]> {
  const staleCutoff = new Date(
    Date.now() - GALLERY_LIMITS.staleImportingThresholdMs,
  );
  return db.$queryRaw<ClaimedItem[]>`
    UPDATE event_gallery_items
       SET status = 'IMPORTING',
           locked_at = NOW(),
           attempts = attempts + 1,
           updated_at = NOW()
     WHERE id IN (
       SELECT id FROM event_gallery_items
        WHERE (status = 'PENDING')
           OR (status = 'IMPORTING' AND locked_at < ${staleCutoff})
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, gallery_id, source_file_id, attempts
  `;
}

type ProcessResult =
  | { outcome: "READY"; data: ReadyOutcome }
  | {
      outcome: "FAILED" | "SKIPPED" | "RETRY";
      errorCode: GalleryErrorCode;
      errorMessage: string;
    };

type ReadyOutcome = {
  publicUrl: string;
  thumbnailUrl: string;
  storageKey: string;
  thumbnailKey: string;
  width: number;
  height: number;
  blurDataUrl: string;
  sizeBytes: number;
  mimeType: string;
};

function classifyError(err: unknown): {
  code: GalleryErrorCode;
  message: string;
} {
  if (err instanceof GoogleDriveDownloadError) {
    return {
      code: err.errorCode,
      message: GALLERY_ERROR_MESSAGES[err.errorCode],
    };
  }
  if (
    err instanceof ProviderTokenRevokedError ||
    err instanceof ProviderTokenNotFoundError
  ) {
    return {
      code: GALLERY_ERROR_CODES.RECONNECT_REQUIRED,
      message: GALLERY_ERROR_MESSAGES.RECONNECT_REQUIRED,
    };
  }
  return {
    code: GALLERY_ERROR_CODES.UNKNOWN_ERROR,
    message:
      err instanceof Error && err.message
        ? err.message.slice(0, 500)
        : GALLERY_ERROR_MESSAGES.UNKNOWN_ERROR,
  };
}

async function detectMimeFromBuffer(buffer: Buffer): Promise<string | null> {
  const { fileTypeFromBuffer } = await import("file-type");
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime ?? null;
}

/**
 * Downloads, re-validates, transcodes, and uploads a single item.
 * Pure function over an item — no DB writes here; the caller persists
 * the result so failures can be classified into auto-retry vs terminal.
 */
async function processItem(
  item: ClaimedItem,
  gallery: GalleryRow,
  event: EventRow,
): Promise<ProcessResult> {
  if (!item.source_file_id) {
    return {
      outcome: "FAILED",
      errorCode: GALLERY_ERROR_CODES.SOURCE_FILE_NOT_FOUND,
      errorMessage: "Item is missing source_file_id",
    };
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(event.creator_id, "GOOGLE_DRIVE");
  } catch (err) {
    const { code, message } = classifyError(err);
    return { outcome: "FAILED", errorCode: code, errorMessage: message };
  }

  let buffer: Buffer;
  try {
    const downloaded = await downloadDriveFile(accessToken, item.source_file_id);
    buffer = downloaded.buffer;
  } catch (err) {
    const { code, message } = classifyError(err);
    // Permanent download errors (file gone, permission lost) become
    // terminal FAILED. Transient (network, 5xx) bubble up as RETRY so
    // the caller can leave attempts under workerMaxAttempts.
    if (isPermanent(code)) {
      return { outcome: "FAILED", errorCode: code, errorMessage: message };
    }
    return { outcome: "RETRY", errorCode: code, errorMessage: message };
  }

  // Re-validate MIME from magic bytes — the Picker reports client-side
  // metadata that an attacker (or a rename) could spoof.
  if (buffer.byteLength > GALLERY_LIMITS.maxImageBytes) {
    return {
      outcome: "FAILED",
      errorCode: GALLERY_ERROR_CODES.FILE_TOO_LARGE,
      errorMessage: GALLERY_ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }
  const detectedMime = await detectMimeFromBuffer(buffer);
  if (
    !detectedMime ||
    !(GALLERY_LIMITS.allowedMimeTypes as readonly string[]).includes(detectedMime)
  ) {
    return {
      outcome: "SKIPPED",
      errorCode: GALLERY_ERROR_CODES.UNSUPPORTED_MIME_TYPE,
      errorMessage: GALLERY_ERROR_MESSAGES.UNSUPPORTED_MIME_TYPE,
    };
  }

  let largeBuffer: Buffer;
  let thumbBuffer: Buffer;
  let blurDataUrl: string;
  let width: number;
  let height: number;
  try {
    const optimized = await optimizeImage(buffer);
    largeBuffer = optimized.buffer;
    width = optimized.width;
    height = optimized.height;
    thumbBuffer = await sharp(buffer)
      .resize(THUMBNAIL_DIMENSION, THUMBNAIL_DIMENSION, {
        fit: "cover",
        position: "attention",
      })
      .webp({ quality: 75 })
      .toBuffer();
    blurDataUrl = await generateBlurDataUrl(buffer);
  } catch (err) {
    const { message } = classifyError(err);
    return {
      outcome: "RETRY",
      errorCode: GALLERY_ERROR_CODES.IMAGE_PROCESSING_FAILED,
      errorMessage: message,
    };
  }

  const basePath = `events/${event.id}/galleries/${gallery.id}/items/${item.id}`;
  const storageKey = `${basePath}/${LARGE_IMAGE_PATH_SUFFIX}`;
  const thumbnailKey = `${basePath}/${THUMBNAIL_PATH_SUFFIX}`;

  let largePublicUrl: string;
  let thumbPublicUrl: string;
  try {
    // uploadFile returns a discriminated union — flatten "error" arms
    // into thrown errors so the outer try/catch picks them up uniformly.
    const [largeUpload, thumbUpload] = await Promise.all([
      uploadFile(BUCKETS.gallery, storageKey, largeBuffer, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
      uploadFile(BUCKETS.gallery, thumbnailKey, thumbBuffer, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
    ]);
    if ("error" in largeUpload) throw new Error(largeUpload.error);
    if ("error" in thumbUpload) throw new Error(thumbUpload.error);
    largePublicUrl = largeUpload.publicUrl;
    thumbPublicUrl = thumbUpload.publicUrl;
  } catch (err) {
    const { message } = classifyError(err);
    return {
      outcome: "RETRY",
      errorCode: GALLERY_ERROR_CODES.STORAGE_UPLOAD_FAILED,
      errorMessage: message,
    };
  }

  return {
    outcome: "READY",
    data: {
      publicUrl: largePublicUrl,
      thumbnailUrl: thumbPublicUrl,
      storageKey,
      thumbnailKey,
      width,
      height,
      blurDataUrl,
      sizeBytes: largeBuffer.byteLength,
      mimeType: "image/webp",
    },
  };
}

async function loadContext(galleryIds: string[]): Promise<{
  galleries: Map<string, GalleryRow>;
  events: Map<string, EventRow>;
}> {
  const galleries = await db.eventGallery.findMany({
    where: { id: { in: galleryIds } },
    select: { id: true, eventId: true },
  });
  const eventIds = [...new Set(galleries.map((g) => g.eventId))];
  const events = eventIds.length
    ? await db.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, creatorId: true },
      })
    : [];
  return {
    galleries: new Map(
      galleries.map((g) => [g.id, { id: g.id, event_id: g.eventId }]),
    ),
    events: new Map(
      events.map((e) => [e.id, { id: e.id, creator_id: e.creatorId }]),
    ),
  };
}

async function persistOutcome(
  item: ClaimedItem,
  result: ProcessResult,
): Promise<"READY" | "FAILED" | "SKIPPED"> {
  if (result.outcome === "READY") {
    await db.eventGalleryItem.update({
      where: { id: item.id },
      data: {
        status: "READY",
        publicUrl: result.data.publicUrl,
        thumbnailUrl: result.data.thumbnailUrl,
        storageBucket: BUCKETS.gallery,
        storageKey: result.data.storageKey,
        thumbnailKey: result.data.thumbnailKey,
        width: result.data.width,
        height: result.data.height,
        blurDataUrl: result.data.blurDataUrl,
        sizeBytes: result.data.sizeBytes,
        mimeType: result.data.mimeType,
        errorCode: null,
        errorMessage: null,
        lockedAt: null,
      },
    });
    return "READY";
  }

  if (result.outcome === "SKIPPED") {
    await db.eventGalleryItem.update({
      where: { id: item.id },
      data: {
        status: "SKIPPED",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        lockedAt: null,
      },
    });
    return "SKIPPED";
  }

  if (result.outcome === "FAILED") {
    await db.eventGalleryItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        lockedAt: null,
      },
    });
    return "FAILED";
  }

  // RETRY: drop back to PENDING if under the attempt cap; otherwise FAILED.
  const terminal = item.attempts >= GALLERY_LIMITS.workerMaxAttempts;
  await db.eventGalleryItem.update({
    where: { id: item.id },
    data: {
      status: terminal ? "FAILED" : "PENDING",
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      lockedAt: null,
    },
  });
  return terminal ? "FAILED" : "READY"; // "READY" is not literally true; signals "did not terminally fail this tick"
}

/**
 * After items are processed, sync each touched job's status + each
 * touched gallery's status from the aggregated item counts. Kept out of
 * the per-item path so we only do one reconciliation per job per tick.
 */
async function reconcileJobs(jobIds: string[]): Promise<number> {
  let count = 0;
  for (const jobId of jobIds) {
    const job = await db.galleryImportJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        galleryId: true,
        status: true,
        startedAt: true,
      },
    });
    if (!job) continue;
    const itemCounts = await db.eventGalleryItem.groupBy({
      by: ["status"],
      where: { galleryId: job.galleryId },
      _count: { _all: true },
    });
    const counts = itemCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    const ready = counts.READY ?? 0;
    const failed = counts.FAILED ?? 0;
    const skipped = counts.SKIPPED ?? 0;
    const pending = (counts.PENDING ?? 0) + (counts.IMPORTING ?? 0);

    let nextJobStatus: "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED" =
      job.status === "QUEUED" ? "PROCESSING" : "PROCESSING";
    if (pending === 0) {
      if (ready === 0 && (failed > 0 || skipped > 0)) nextJobStatus = "FAILED";
      else if (failed > 0 || skipped > 0) nextJobStatus = "PARTIAL";
      else nextJobStatus = "COMPLETED";
    }

    const update: Prisma.GalleryImportJobUpdateInput = {
      status: nextJobStatus,
      processedItems: ready,
      failedItems: failed,
      skippedItems: skipped,
    };
    if (!job.startedAt && (ready > 0 || failed > 0 || skipped > 0)) {
      update.startedAt = new Date();
    }
    if (pending === 0) update.completedAt = new Date();
    await db.galleryImportJob.update({ where: { id: job.id }, data: update });

    // Sync the gallery's lifecycle status. Don't touch PUBLISHED galleries
    // (they're already live) or HIDDEN (operator decision). SYNCING flips
    // to READY once any item is ready; ERROR if every item failed.
    const gallery = await db.eventGallery.findUnique({
      where: { id: job.galleryId },
      select: { status: true },
    });
    if (gallery && gallery.status !== "PUBLISHED" && gallery.status !== "HIDDEN") {
      let nextGalleryStatus: "SYNCING" | "READY" | "ERROR" = "SYNCING";
      if (pending === 0) {
        nextGalleryStatus = ready > 0 ? "READY" : "ERROR";
      }
      if (nextGalleryStatus !== gallery.status) {
        await db.eventGallery.update({
          where: { id: job.galleryId },
          data: { status: nextGalleryStatus },
        });
      }
    }
    count++;
  }
  return count;
}

/**
 * Top-level entry point. Returns a tally for the cron route to log.
 */
export async function processGalleryImports(): Promise<WorkerRunSummary> {
  const items = await claimPendingItems(GALLERY_LIMITS.workerBatchSize);
  if (items.length === 0) {
    return { claimed: 0, ready: 0, failed: 0, skipped: 0, jobsReconciled: 0 };
  }

  const galleryIds = [...new Set(items.map((i) => i.gallery_id))];
  const { galleries: galleryCtx, events: eventCtx } = await loadContext(galleryIds);

  let ready = 0;
  let failed = 0;
  let skipped = 0;
  const touchedJobIds = new Set<string>();

  // Sequential processing keeps memory predictable (each Sharp transform
  // can hold a multi-MB buffer). The batch size + 60s function cap means
  // we don't need parallelism to hit the 25-min end-to-end target.
  for (const item of items) {
    const gallery = galleryCtx.get(item.gallery_id);
    const eventRow = gallery ? eventCtx.get(gallery.event_id) : undefined;
    if (!gallery || !eventRow) {
      // Orphaned item (gallery or event gone) — terminally fail it.
      await db.eventGalleryItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorCode: GALLERY_ERROR_CODES.UNKNOWN_ERROR,
          errorMessage: "Parent gallery or event no longer exists",
          lockedAt: null,
        },
      });
      failed++;
      continue;
    }

    const result = await processItem(item, gallery, eventRow);
    const persisted = await persistOutcome(item, result);
    if (persisted === "READY") ready++;
    else if (persisted === "SKIPPED") skipped++;
    else if (persisted === "FAILED") failed++;

    // Find the most-recent QUEUED/PROCESSING job for this gallery to
    // mark for reconciliation. Items don't carry job_id directly (multiple
    // re-imports could have written to the same item), so we use "the
    // currently-open job for this gallery."
    const job = await db.galleryImportJob.findFirst({
      where: {
        galleryId: gallery.id,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (job) touchedJobIds.add(job.id);
  }

  const jobsReconciled = await reconcileJobs([...touchedJobIds]);

  return {
    claimed: items.length,
    ready,
    failed,
    skipped,
    jobsReconciled,
  };
}

// Re-export internals for tests. The cron route only needs
// processGalleryImports + getPendingItemCount.
export const __testing = {
  claimPendingItems,
  processItem,
  persistOutcome,
  reconcileJobs,
};
