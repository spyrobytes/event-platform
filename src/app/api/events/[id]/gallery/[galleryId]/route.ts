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

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

/**
 * DELETE /api/events/[id]/gallery/[galleryId]
 *
 * Removes the gallery row and (via DB cascade) all `event_gallery_items`.
 * Phase 1 (external-link only) has no storage blobs to clean up; PR #7
 * adds Supabase Storage cleanup for native gallery items.
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
      select: { id: true, event: { select: { slug: true } } },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    await db.eventGallery.delete({ where: { id: galleryId } });
    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ id: galleryId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
