import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { deleteGalleryItemBlobs } from "@/lib/gallery-storage";
import { revalidateEventAndGallery } from "@/lib/revalidation";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string; itemId: string }>;
};

const patchItemSchema = z.object({
  isHidden: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  caption: z.string().trim().max(500).nullable().optional(),
  alt: z.string().trim().max(500).optional(),
});

/**
 * PATCH /api/events/[id]/gallery/[galleryId]/items/[itemId]
 *
 * Per-item field updates: hide/unhide, caption, alt. Only fields
 * explicitly present in the body are touched (undefined = leave alone,
 * null on `caption` = clear).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId, galleryId, itemId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const body = await request.json().catch(() => ({}));
    const input = patchItemSchema.parse(body);

    // Verify item belongs to the gallery + event before mutating. One
    // round-trip via the chained where (item → gallery → event). We also
    // pull coverGalleryItemId so the hide path can null the dangling cover
    // reference in the same write.
    const item = await db.eventGalleryItem.findFirst({
      where: { id: itemId, galleryId, gallery: { eventId } },
      select: {
        id: true,
        gallery: {
          select: {
            id: true,
            coverGalleryItemId: true,
            event: { select: { slug: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundError("Gallery item not found");

    const data: {
      isHidden?: boolean;
      isFeatured?: boolean;
      caption?: string | null;
      alt?: string;
    } = {};
    if (input.isHidden !== undefined) data.isHidden = input.isHidden;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.caption !== undefined) {
      data.caption = input.caption === null ? null : input.caption;
    }
    if (input.alt !== undefined) data.alt = input.alt;

    if (Object.keys(data).length === 0) {
      return successResponse({ id: itemId, unchanged: true });
    }

    // Hiding the current cover leaves the dashboard showing a "Cover" badge
    // on an item the public payload won't surface (public cover resolution
    // drops hidden items). Clear the soft FK in the same transaction so the
    // dashboard state matches what visitors see — matches the item-DELETE
    // contract in this file.
    const hidingCover =
      data.isHidden === true && item.gallery.coverGalleryItemId === itemId;

    if (hidingCover) {
      await db.$transaction([
        db.eventGalleryItem.update({ where: { id: itemId }, data }),
        db.eventGallery.update({
          where: { id: item.gallery.id },
          data: { coverGalleryItemId: null },
        }),
      ]);
    } else {
      await db.eventGalleryItem.update({ where: { id: itemId }, data });
    }

    await revalidateEventAndGallery(item.gallery.event.slug);

    return successResponse({ id: itemId, ...(hidingCover ? { clearedCover: true } : {}) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]/gallery/[galleryId]/items/[itemId]
 *
 * Removes the item row AND its Supabase Storage blobs (large + thumb).
 * Also nulls `event_galleries.cover_gallery_item_id` if this item was
 * the cover — the schema's soft FK can't cascade that one (see PR #117
 * review follow-up + plan §8.2 cleanup obligation).
 *
 * Storage cleanup runs before the DB delete. If blob deletion fails
 * mid-flight, the DB row stays so the orphan is discoverable from the
 * dashboard rather than leaking a phantom URL — caller logs the
 * `storageErrors` for admin follow-up.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId, galleryId, itemId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const item = await db.eventGalleryItem.findFirst({
      where: { id: itemId, galleryId, gallery: { eventId } },
      select: {
        id: true,
        storageBucket: true,
        storageKey: true,
        thumbnailKey: true,
        gallery: {
          select: {
            id: true,
            coverGalleryItemId: true,
            event: { select: { slug: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundError("Gallery item not found");

    // Best-effort storage cleanup BEFORE the DB delete. If any blob
    // delete fails we abort so the row stays as a beacon for the orphan.
    const storage = await deleteGalleryItemBlobs([
      {
        bucket: item.storageBucket,
        storageKey: item.storageKey,
        thumbnailKey: item.thumbnailKey,
      },
    ]);

    if (storage.failed > 0) {
      console.error("[gallery item delete] storage cleanup partial failure", {
        itemId,
        ...storage,
      });
      return errorResponse(
        "Could not delete photo storage. Please try again.",
        500,
        "STORAGE_DELETE_FAILED",
        storage.errors,
      );
    }

    // DB delete + cover-null-out in a single transaction so a dashboard
    // viewing this gallery never sees a dangling cover ref.
    await db.$transaction([
      ...(item.gallery.coverGalleryItemId === itemId
        ? [
            db.eventGallery.update({
              where: { id: item.gallery.id },
              data: { coverGalleryItemId: null },
            }),
          ]
        : []),
      db.eventGalleryItem.delete({ where: { id: itemId } }),
    ]);

    await revalidateEventAndGallery(item.gallery.event.slug);

    return successResponse({ id: itemId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
