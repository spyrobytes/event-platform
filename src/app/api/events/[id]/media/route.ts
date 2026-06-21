import { NextRequest, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canUploadMedia, assertCanMutate } from "@/lib/authorization";
import { resolveEffectiveUser, auditImpersonatedEdit } from "@/lib/impersonation";
import { AppError } from "@/lib/errors";
import {
  validateUploadedImage,
  optimizeImage,
  generateBlurDataUrl,
} from "@/lib/media-validation";
import {
  uploadFile,
  deleteFile,
  BUCKETS,
  getEventAssetPath,
  ensureBucket,
} from "@/lib/supabase-storage";
import {
  uploadRenditions,
  renditionSiblingPaths,
} from "@/lib/images/rendition-storage";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MEDIA_TAGS, deriveKindFromTags, type MediaTag } from "@/lib/media-tags";
import { stripAssetRefsFromConfig } from "@/lib/media-asset-refs";
import { validateAndMigrate } from "@/lib/config-migrations";
import { revalidateEventPage } from "@/lib/revalidation";
import { clearEventCoversForAssets } from "@/lib/cover-media-asset";
import { PAGE_CONFIG_LIMITS } from "@/schemas/event-page";
import {
  HERO_DISPLAY_MAX_DIMENSION,
  RESPONSIVE_RENDITION_WIDTHS,
} from "@/schemas/media-asset";

const deleteAssetSchema = z.object({
  assetId: z.string().min(1),
});

const tagSchema = z.enum(MEDIA_TAGS);

const patchAssetSchema = z.object({
  assetId: z.string().min(1),
  tags: z.array(tagSchema).min(1),
});

const MAX_ASSETS_PER_EVENT = PAGE_CONFIG_LIMITS.maxAssetsPerEvent;

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
    const { id: eventId } = await context.params;
    const ctx = await resolveEffectiveUser(request, eventId);
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }
    const { effective } = ctx;
    assertCanMutate(effective);

    // 2. Check upload permissions (includes ownership verification)
    const uploadCheck = await canUploadMedia(eventId, effective.id);
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

    // 6. Optimize image (convert to WebP, resize if needed). HERO covers are
    // display-only, so cap them at HERO_DISPLAY_MAX_DIMENSION. Galleries keep the
    // full 4000px ceiling: they feed a lightbox, and what saves bandwidth is the
    // responsive ladder generated below (small rungs served to small viewports),
    // NOT a smaller original — so we keep the original full-res, non-destructively
    // (issue #211).
    const optimized = await optimizeImage(
      buffer,
      kind === "HERO"
        ? {
            maxWidth: HERO_DISPLAY_MAX_DIMENSION,
            maxHeight: HERO_DISPLAY_MAX_DIMENSION,
          }
        : {}
    );

    // 6b. Generate blur placeholder for lazy-loading
    const blurDataUrl = await generateBlurDataUrl(optimized.buffer);

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

    // 10. Create database record. renditionWidths starts empty (DB default);
    // the background job below fills it in.
    const asset = await db.mediaAsset.create({
      data: {
        eventId,
        // The asset belongs to the organizer's media library, even when an
        // admin uploads it while acting-as (actor === effective when not). The
        // audit log below records who actually performed the upload.
        ownerUserId: effective.id,
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
        blurDataUrl,
      },
    });

    // 10b. Generate responsive renditions AFTER the response is flushed (Tier 2
    // / issue #211 — for both HERO covers and galleries). They're non-fatal and
    // not needed immediately (the loader falls back to the original until they
    // land), so the uploader doesn't wait. Record the widths that actually
    // uploaded so the loader never references a missing rendition.
    after(async () => {
      try {
        const { uploadedWidths } = await uploadRenditions({
          bucket: BUCKETS.eventAssets,
          basePath: storagePath,
          buffer: optimized.buffer,
          widths: RESPONSIVE_RENDITION_WIDTHS,
        });
        if (uploadedWidths.length === 0) return;

        try {
          await db.mediaAsset.update({
            where: { id: asset.id },
            data: { renditionWidths: uploadedWidths },
          });
        } catch {
          // The asset was deleted while renditions were generating; remove the
          // renditions we just uploaded so they don't orphan in storage.
          await Promise.all(
            renditionSiblingPaths(storagePath, uploadedWidths).map((p) =>
              deleteFile(BUCKETS.eventAssets, p).catch(() => {})
            )
          );
        }
      } catch (err) {
        console.error("Rendition generation failed:", err);
      }
    });

    // Revalidate public page if event is published
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { slug: true, status: true },
    });
    if (event?.status === "PUBLISHED") {
      await revalidateEventPage(event.slug);
    }

    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "media.POST",
      assetId: asset.id,
      kind,
    });

    return successResponse(
      {
        id: asset.id,
        publicUrl: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        kind: asset.kind,
        tags: asset.tags,
        blurDataUrl: asset.blurDataUrl,
      },
      201
    );
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
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
    const { id: eventId } = await context.params;
    const ctx = await resolveEffectiveUser(request, eventId);
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    // 2. Verify user can access event assets
    const uploadCheck = await canUploadMedia(eventId, ctx.effective.id);
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
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
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
    const { id: eventId } = await context.params;
    const ctx = await resolveEffectiveUser(request, eventId);
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }
    const { effective } = ctx;
    assertCanMutate(effective);

    // 2. Verify user can modify event assets
    const uploadCheck = await canUploadMedia(eventId, effective.id);
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

    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "media.PATCH",
      assetId,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request body", 400);
    }
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.code);
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
    const { id: eventId } = await context.params;
    const ctx = await resolveEffectiveUser(request, eventId);
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }
    const { effective } = ctx;
    assertCanMutate(effective);

    // 2. Verify user can modify event assets
    const uploadCheck = await canUploadMedia(eventId, effective.id);
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

    // 5. Transactionally: strip references from the event's pageConfig, then
    //    delete the asset row. This guarantees the DB never ends up with a
    //    deleted asset still referenced from pageConfig, regardless of what
    //    the client does afterward.
    await db.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { pageConfig: true },
      });

      if (event?.pageConfig) {
        try {
          const currentConfig = validateAndMigrate(event.pageConfig);
          const cleanedConfig = stripAssetRefsFromConfig(currentConfig, assetId);
          await tx.event.update({
            where: { id: eventId },
            data: { pageConfig: cleanedConfig },
          });
        } catch (err) {
          // If the existing config is malformed, don't block the delete.
          // The asset row still goes away; a subsequent page-config load
          // will reconstitute from defaults.
          console.error("pageConfig cleanup skipped (invalid config):", err);
        }
      }

      // If this asset is any event's cover, clear the cover pair so
      // coverImageUrl doesn't drift to a now-deleted storage object. Done before
      // the delete so the still-set coverMediaAssetId matches. A GALLERY asset
      // can be a cover too — CoverImagePicker lists every kind and
      // resolveCoverMediaAssetId has no kind filter — and the FK's SetNull alone
      // would leave coverImageUrl stale, so this runs for every kind. It no-ops
      // when the asset isn't a cover (the updateMany WHERE matches nothing) (#211).
      await clearEventCoversForAssets(tx, [assetId]);

      await tx.mediaAsset.delete({ where: { id: assetId } });
    });

    // 6. Delete from storage (best effort — outside the transaction because
    //    it's a separate system and failure shouldn't roll back the DB work).
    //    We also remove the responsive rendition siblings (every asset gets a
    //    ladder now — HERO covers and galleries alike). We try the union of the
    //    recorded widths and the current ladder so cleanup is robust to a ladder
    //    change since upload, or to the background rendition job not having
    //    recorded its widths yet (#211). Missing files no-op.
    const renditionWidthSet = new Set([
      ...asset.renditionWidths,
      ...RESPONSIVE_RENDITION_WIDTHS,
    ]);
    const pathsToDelete = [
      asset.path,
      ...renditionSiblingPaths(asset.path, renditionWidthSet),
    ];
    await Promise.all(
      pathsToDelete.map((p) =>
        deleteFile(asset.bucket, p).catch((err) => {
          console.error(`Failed to delete file from storage (${p}):`, err);
        })
      )
    );

    // Revalidate public page if event is published
    const eventForReval = await db.event.findUnique({
      where: { id: eventId },
      select: { slug: true, status: true },
    });
    if (eventForReval?.status === "PUBLISHED") {
      await revalidateEventPage(eventForReval.slug);
    }

    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "media.DELETE",
      assetId,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    console.error("Media delete error:", error);
    return errorResponse("Internal server error", 500);
  }
}
