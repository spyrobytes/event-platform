import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { insertRenditionWidth } from "@/lib/images/rendition";

// Bucket names
export const BUCKETS = {
  eventAssets: "event-assets",
  gallery: "gallery",
} as const;

// Storage client singleton
let storageClient: SupabaseClient | null = null;

/**
 * Get Supabase storage client
 * Uses service role key for server-side operations
 */
export function getStorageClient(): SupabaseClient {
  if (storageClient) {
    return storageClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase storage misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set"
    );
  }

  storageClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return storageClient;
}

/**
 * Upload a file to Supabase Storage.
 *
 * `upsert` defaults to `false` (existing behavior for media uploads — fail
 * if the key already exists, prompting the caller to handle the conflict).
 * The gallery import worker passes `upsert: true` because retries are
 * expected: a partial-upload failure (large.webp succeeds, thumb.webp
 * fails) would otherwise deadlock on the next attempt because the large
 * key is already taken.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  options: {
    contentType: string;
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const client = getStorageClient();

  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType: options.contentType,
    cacheControl: options.cacheControl || "3600",
    upsert: options.upsert ?? false,
  });

  if (error) {
    console.error("Storage upload error:", error);
    return { error: error.message };
  }

  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(path);

  return { path, publicUrl };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  const client = getStorageClient();

  const { error } = await client.storage.from(bucket).remove([path]);

  if (error) {
    console.error("Storage delete error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * List files in a bucket path
 */
export async function listFiles(
  bucket: string,
  path: string
): Promise<{ files: string[]; error?: string }> {
  const client = getStorageClient();

  const { data, error } = await client.storage.from(bucket).list(path);

  if (error) {
    console.error("Storage list error:", error);
    return { files: [], error: error.message };
  }

  return { files: data?.map((f) => f.name) || [] };
}

/**
 * Generate the storage path for an event asset
 */
export function getEventAssetPath(
  eventId: string,
  type: "hero" | "gallery",
  filename: string
): string {
  return `${eventId}/${type}/${filename}`;
}

/**
 * Storage path for a responsive rendition sibling of an original asset, e.g.
 * "evt/hero/123.webp" + 640 -> "evt/hero/123_w640.webp". Used by ingestion
 * (upload) and deletion (cleanup); delegates to the shared rendition helper so
 * the server path convention and the client loader URL convention can't drift.
 * See issue #211 (Tier 2).
 */
export function getRenditionPath(originalPath: string, width: number): string {
  return insertRenditionWidth(originalPath, width);
}

/**
 * Ensure a bucket exists, creating it with the given spec when missing.
 *
 * Idempotent and safe to call on every request / worker tick. When the
 * bucket already exists this is a no-op — we deliberately do NOT reconcile
 * settings on an existing bucket (an operator may have tuned it by hand in
 * Studio; Supabase's updateBucket could clobber that). The spec below only
 * applies at create time, so a self-healed bucket matches the consumer's
 * expectations instead of a bare public-only default.
 *
 * `public` defaults to true to preserve the original single-arg behavior
 * for callers that pass no options (e.g. event-assets). `fileSizeLimit`
 * accepts bytes (number) or a units string ("50MiB"); `allowedMimeTypes`
 * restricts uploads at the storage boundary.
 *
 * Transient-error safety: a failed `getBucket` is NOT assumed to mean
 * "missing" — we attempt create, and if create then errors we re-check
 * existence authoritatively before reporting failure. That way a transient
 * Storage blip on an existing bucket never false-fails (the worker would
 * otherwise abort a whole tick over a bucket that's actually fine). A genuine
 * outage where the bucket truly can't be created still returns failure, which
 * is correct — uploads to it would fail anyway.
 *
 * Never throws: getBucket/createBucket return `{ error }` for Storage-level
 * failures (404, permission), but storage-js rethrows raw transport errors
 * (DNS, connection reset, timeout — TypeErrors, not StorageErrors). We catch
 * those and report `{ success: false }` so every caller can branch on the
 * return value alone and a transport blip can't take down a worker tick as an
 * unhandled rejection.
 */
export async function ensureBucket(
  bucket: string,
  options: {
    public?: boolean;
    fileSizeLimit?: number | string;
    allowedMimeTypes?: string[];
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getStorageClient();

    // Fast path: the bucket already exists (getBucket returns data on success).
    const existing = await client.storage.getBucket(bucket);
    if (!existing.error && existing.data) {
      return { success: true };
    }

    // Bucket may be missing — or getBucket hit a transient error. Try to create
    // it with the expected spec.
    const { error: createError } = await client.storage.createBucket(bucket, {
      public: options.public ?? true,
      ...(options.fileSizeLimit !== undefined
        ? { fileSizeLimit: options.fileSizeLimit }
        : {}),
      ...(options.allowedMimeTypes !== undefined
        ? { allowedMimeTypes: options.allowedMimeTypes }
        : {}),
    });
    if (!createError) {
      return { success: true };
    }

    // Create failed. Two benign cases must NOT count as failure: (1) a
    // concurrent caller already created it, or (2) the bucket existed all along
    // and the initial getBucket returned a transient error. Rather than
    // pattern-match every provider error string, re-check existence — only a
    // bucket that is STILL absent is a real failure.
    if (createError.message.includes("already exists")) {
      return { success: true };
    }
    const recheck = await client.storage.getBucket(bucket);
    if (!recheck.error && recheck.data) {
      return { success: true };
    }

    return { success: false, error: createError.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown storage error",
    };
  }
}
