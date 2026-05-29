import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
 */
export async function ensureBucket(
  bucket: string,
  options: {
    public?: boolean;
    fileSizeLimit?: number | string;
    allowedMimeTypes?: string[];
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const client = getStorageClient();

  // Try to get bucket info
  const { error: getError } = await client.storage.getBucket(bucket);

  if (getError) {
    // Bucket doesn't exist, create it with the expected spec.
    const { error: createError } = await client.storage.createBucket(bucket, {
      public: options.public ?? true,
      ...(options.fileSizeLimit !== undefined
        ? { fileSizeLimit: options.fileSizeLimit }
        : {}),
      ...(options.allowedMimeTypes !== undefined
        ? { allowedMimeTypes: options.allowedMimeTypes }
        : {}),
    });

    if (createError && !createError.message.includes("already exists")) {
      return { success: false, error: createError.message };
    }
  }

  return { success: true };
}
