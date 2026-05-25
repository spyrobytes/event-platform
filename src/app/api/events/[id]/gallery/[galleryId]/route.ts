import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { revalidateEventAndGallery } from "@/lib/revalidation";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { deleteGalleryItemBlobs } from "@/lib/gallery-storage";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

/**
 * DELETE /api/events/[id]/gallery/[galleryId]
 *
 * Removes the gallery row and (via DB cascade) all `event_gallery_items`
 * + `gallery_import_jobs`. For native galleries, batch-deletes all item
 * blobs from Supabase Storage BEFORE the DB cascade so we don't strand
 * orphans when the rows are gone.
 *
 * If storage deletion partially fails, we abort and surface the
 * affected keys for admin follow-up. Better to leave a recoverable
 * partial state than silently leak blobs the dashboard can no longer
 * reach (the rows would be gone and the orphans invisible).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId, galleryId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const gallery = await db.eventGallery.findFirst({
      where: { id: galleryId, eventId },
      select: {
        id: true,
        event: { select: { slug: true } },
        items: {
          select: { storageBucket: true, storageKey: true, thumbnailKey: true },
        },
      },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    // External-link galleries have no items, so this is a no-op for them.
    if (gallery.items.length > 0) {
      const storage = await deleteGalleryItemBlobs(
        gallery.items.map((i) => ({
          bucket: i.storageBucket,
          storageKey: i.storageKey,
          thumbnailKey: i.thumbnailKey,
        })),
      );
      if (storage.failed > 0) {
        console.error("[gallery delete] storage cleanup partial failure", {
          galleryId,
          ...storage,
        });
        return errorResponse(
          "Could not delete all photo storage. Please try again.",
          500,
          "STORAGE_DELETE_FAILED",
          storage.errors,
        );
      }
    }

    await db.eventGallery.delete({ where: { id: galleryId } });
    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ id: galleryId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
