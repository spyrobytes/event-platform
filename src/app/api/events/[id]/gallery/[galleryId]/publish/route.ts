import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { revalidateEventAndGallery } from "@/lib/revalidation";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

/**
 * POST /api/events/[id]/gallery/[galleryId]/publish
 *
 * Flip a gallery to PUBLISHED. External-link galleries publish immediately;
 * native galleries (PR #4+) additionally require ≥1 READY item.
 */
export async function POST(request: NextRequest, context: RouteContext) {
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
      select: { id: true, status: true, sourceType: true },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    if (gallery.sourceType !== "EXTERNAL_LINK") {
      const readyCount = await db.eventGalleryItem.count({
        where: { galleryId, status: "READY", isHidden: false },
      });
      if (readyCount === 0) {
        throw new ValidationError(
          "Cannot publish a native gallery with no ready photos.",
        );
      }
    }

    const updated = await db.eventGallery.update({
      where: { id: galleryId },
      data: {
        status: "PUBLISHED",
        publishedAt:
          gallery.status === "PUBLISHED" ? undefined : new Date(),
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        event: { select: { slug: true } },
      },
    });

    await revalidateEventAndGallery(updated.event.slug);

    return successResponse({
      id: updated.id,
      status: updated.status,
      publishedAt: updated.publishedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
