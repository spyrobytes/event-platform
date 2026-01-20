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

  const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    // Local development fallback (from supabase start output)
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  storageClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return storageClient;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  options: {
    contentType: string;
    cacheControl?: string;
  }
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const client = getStorageClient();

  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType: options.contentType,
    cacheControl: options.cacheControl || "3600",
    upsert: false,
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
 * Ensure a bucket exists (for local development)
 */
export async function ensureBucket(
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  const client = getStorageClient();

  // Try to get bucket info
  const { error: getError } = await client.storage.getBucket(bucket);

  if (getError) {
    // Bucket doesn't exist, create it
    const { error: createError } = await client.storage.createBucket(bucket, {
      public: true,
    });

    if (createError && !createError.message.includes("already exists")) {
      return { success: false, error: createError.message };
    }
  }

  return { success: true };
}
