import { NextRequest } from "next/server";
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
 * - kind: "HERO" | "GALLERY"
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
    const kind = formData.get("kind") as string | null;
    const alt = (formData.get("alt") as string) || "";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (!kind || !["HERO", "GALLERY"].includes(kind)) {
      return errorResponse("Invalid asset kind. Must be HERO or GALLERY", 400);
    }

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
        kind: kind as "HERO" | "GALLERY",
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

    // 3. Fetch assets
    const assets = await db.mediaAsset.findMany({
      where: { eventId },
      select: {
        id: true,
        kind: true,
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

    // 3. Parse body
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return errorResponse("assetId is required", 400);
    }

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
