import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUploadMedia } from "@/lib/authorization";
import { validateUploadedImage, optimizeImage } from "@/lib/media-validation";
import {
  uploadFile,
  BUCKETS,
  getEventAssetPath,
  ensureBucket,
} from "@/lib/supabase-storage";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MEDIA_TAGS, deriveKindFromTags, type MediaTag } from "@/lib/media-tags";

const deleteAssetSchema = z.object({
  assetId: z.string().min(1),
});

const tagSchema = z.enum(MEDIA_TAGS);

const patchAssetSchema = z.object({
  assetId: z.string().min(1),
  tags: z.array(tagSchema).min(1),
});

// Rate limit: max uploads per event
const MAX_ASSETS_PER_EVENT = 20;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/media
 * Upload a media asset for an event
 *
 * Expects multipart/form-data with:
 * - file: The image file
 * - tags: JSON-encoded array of MediaTag values (e.g. ["gallery","portrait"]).
 *   Optional for backward compatibility — if omitted, derived from `kind`.
 * - kind: "HERO" | "GALLERY" (legacy; optional if `tags` is provided).
 *   Used for storage-path routing. Derived from tags if not sent.
 * - alt: Optional alt text
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    // 2. Check upload permissions (includes ownership verification)
    const uploadCheck = await canUploadMedia(eventId, user.id);
    if (!uploadCheck.allowed) {
      return errorResponse(uploadCheck.reason || "Upload not allowed", 403);
    }

    const existingAssetCount = await db.mediaAsset.count({
      where: { eventId },
    });

    if (existingAssetCount >= MAX_ASSETS_PER_EVENT) {
      return errorResponse(
        `Maximum ${MAX_ASSETS_PER_EVENT} assets allowed per event`,
        400
      );
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawKind = formData.get("kind") as string | null;
    const rawTags = formData.get("tags") as string | null;
    const alt = (formData.get("alt") as string) || "";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Parse and validate tags. `tags` is the preferred input; `kind` is kept
    // for backward compatibility and will be derived from tags if not sent.
    let tags: MediaTag[] = [];
    if (rawTags) {
      try {
        const parsed = JSON.parse(rawTags);
        tags = z.array(tagSchema).min(1).parse(parsed);
      } catch {
        return errorResponse("Invalid tags. Must be a JSON array of known tag names.", 400);
      }
    } else if (rawKind && ["HERO", "GALLERY"].includes(rawKind)) {
      // Backfill from legacy `kind` field
      tags = [rawKind === "HERO" ? "hero" : "gallery"];
    } else {
      return errorResponse("Must provide either `tags` or a valid `kind`", 400);
    }

    const kind = deriveKindFromTags(tags);

    // 5. Convert file to buffer and validate
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = await validateUploadedImage(buffer);
    if (!validation.valid) {
      return errorResponse(validation.error || "Invalid image", 400);
    }

    // 6. Optimize image (convert to WebP, resize if needed)
    const optimized = await optimizeImage(buffer);

    // 7. Generate unique filename and path
    const timestamp = Date.now();
    const filename = `${timestamp}.webp`;
    const pathType = kind === "HERO" ? "hero" : "gallery";
    const storagePath = getEventAssetPath(eventId, pathType, filename);

    // 8. Ensure bucket exists (for local development)
    await ensureBucket(BUCKETS.eventAssets);

    // 9. Upload to storage
    const uploadResult = await uploadFile(
      BUCKETS.eventAssets,
      storagePath,
      optimized.buffer,
      {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000", // 1 year cache
      }
    );

    if ("error" in uploadResult) {
      console.error("Upload failed:", uploadResult.error);
      return errorResponse("Failed to upload file", 500);
    }

    // 10. Create database record
    const asset = await db.mediaAsset.create({
      data: {
        eventId,
        ownerUserId: user.id,
        kind,
        tags,
        bucket: BUCKETS.eventAssets,
        path: storagePath,
        publicUrl: uploadResult.publicUrl,
        mimeType: "image/webp",
        sizeBytes: optimized.buffer.length,
        width: optimized.width,
        height: optimized.height,
        alt,
      },
    });

    return successResponse(
      {
        id: asset.id,
        publicUrl: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        kind: asset.kind,
        tags: asset.tags,
      },
      201
    );
  } catch (error) {
    console.error("Media upload error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * GET /api/events/[id]/media
 * List all media assets for an event
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    // 2. Verify user can access event assets
    const uploadCheck = await canUploadMedia(eventId, user.id);
    if (!uploadCheck.allowed && uploadCheck.reason?.includes("permission")) {
      return errorResponse("Event not found or access denied", 404);
    }

    // 3. Fetch assets (optionally filtered by tag via ?tag=<name>)
    const tagFilter = request.nextUrl.searchParams.get("tag");
    const assets = await db.mediaAsset.findMany({
      where: {
        eventId,
        ...(tagFilter ? { tags: { has: tagFilter } } : {}),
      },
      select: {
        id: true,
        kind: true,
        tags: true,
        publicUrl: true,
        width: true,
        height: true,
        alt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ assets });
  } catch (error) {
    console.error("Media list error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/events/[id]/media
 * Update tags on an existing asset.
 * Body: { assetId: string, tags: MediaTag[] }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    // 2. Verify user can modify event assets
    const uploadCheck = await canUploadMedia(eventId, user.id);
    if (!uploadCheck.allowed) {
      return errorResponse(uploadCheck.reason || "Not allowed", 403);
    }

    // 3. Parse and validate body
    const body = await request.json();
    const { assetId, tags } = patchAssetSchema.parse(body);

    // 4. Verify asset belongs to this event
    const existing = await db.mediaAsset.findFirst({
      where: { id: assetId, eventId },
      select: { id: true },
    });
    if (!existing) {
      return errorResponse("Asset not found", 404);
    }

    // 5. Update tags + derive kind from the new tag set so the storage-path
    //    bucket stays consistent with how the asset is classified.
    const updated = await db.mediaAsset.update({
      where: { id: assetId },
      data: {
        tags,
        kind: deriveKindFromTags(tags),
      },
      select: {
        id: true,
        kind: true,
        tags: true,
        publicUrl: true,
        width: true,
        height: true,
        alt: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request body", 400);
    }
    console.error("Media patch error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/events/[id]/media
 * Delete a media asset
 * Body: { assetId: string }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    // 2. Verify user can modify event assets
    const uploadCheck = await canUploadMedia(eventId, user.id);
    if (!uploadCheck.allowed && uploadCheck.reason?.includes("permission")) {
      return errorResponse("Event not found or access denied", 404);
    }

    // 3. Parse and validate body
    const body = await request.json();
    const { assetId } = deleteAssetSchema.parse(body);

    // 4. Find and verify asset belongs to this event
    const asset = await db.mediaAsset.findFirst({
      where: {
        id: assetId,
        eventId,
      },
    });

    if (!asset) {
      return errorResponse("Asset not found", 404);
    }

    // 5. Delete from storage (best effort - don't fail if storage delete fails)
    const { deleteFile } = await import("@/lib/supabase-storage");
    await deleteFile(asset.bucket, asset.path).catch((err) => {
      console.error("Failed to delete file from storage:", err);
    });

    // 6. Delete database record
    await db.mediaAsset.delete({
      where: { id: assetId },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Media delete error:", error);
    return errorResponse("Internal server error", 500);
  }
}
