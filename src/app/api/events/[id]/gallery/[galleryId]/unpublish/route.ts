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
 * POST /api/events/[id]/gallery/[galleryId]/unpublish
 *
 * Flip a gallery from PUBLISHED to HIDDEN. Keeps the row and any imported
 * items so re-publishing later is a single click. Public surfaces (hero
 * CTA, teaser, dedicated route) all disappear within one revalidation
 * window.
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
      select: { id: true },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    const updated = await db.eventGallery.update({
      where: { id: galleryId },
      data: { status: "HIDDEN" },
      select: {
        id: true,
        status: true,
        event: { select: { slug: true } },
      },
    });

    await revalidateEventAndGallery(updated.event.slug);

    return successResponse({ id: updated.id, status: updated.status });
  } catch (error) {
    return handleApiError(error);
  }
}
