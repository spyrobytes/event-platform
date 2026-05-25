import { BUCKETS, deleteFile } from "@/lib/supabase-storage";

/**
 * Storage-lifecycle helpers for gallery items.
 *
 * The worker uploads `large.webp` + `thumb.webp` per item; deletes need
 * to drop both. Supabase Storage doesn't enforce referential integrity
 * with the DB — if we delete a row without removing its blobs, the
 * objects stick around forever as orphans. Inversely, if storage
 * deletion fails, we keep the row so the orphan is at least discoverable
 * via the dashboard (rather than a phantom URL pointing at a dead blob).
 *
 * Per the consolidated-plan storage-lifecycle section: best-effort on
 * each blob, surface failures to the caller so the API handler can leave
 * the DB row intact and log for admin follow-up.
 */

export type StorageBlobRef = {
  bucket: string | null;
  storageKey: string | null;
  thumbnailKey: string | null;
};

export type StorageDeletionResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: Array<{ key: string; reason: string }>;
};

/**
 * Deletes the large + thumbnail blobs for a set of gallery items.
 * Continues past per-item failures so one bad object doesn't strand
 * the rest. Items with null storage keys (never reached READY) are
 * counted as no-ops — they have nothing to delete.
 */
export async function deleteGalleryItemBlobs(
  items: ReadonlyArray<StorageBlobRef>,
): Promise<StorageDeletionResult> {
  const result: StorageDeletionResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (const item of items) {
    const bucket = item.bucket ?? BUCKETS.gallery;
    const keys = [item.storageKey, item.thumbnailKey].filter(
      (k): k is string => typeof k === "string" && k.length > 0,
    );
    for (const key of keys) {
      result.attempted++;
      const outcome = await deleteFile(bucket, key);
      if (outcome.success) {
        result.succeeded++;
      } else {
        result.failed++;
        result.errors.push({ key, reason: outcome.error ?? "Unknown error" });
      }
    }
  }
  return result;
}
