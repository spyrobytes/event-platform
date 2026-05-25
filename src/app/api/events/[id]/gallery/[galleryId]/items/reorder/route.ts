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
import { NotFoundError, ValidationError } from "@/lib/errors";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { revalidateEventAndGallery } from "@/lib/revalidation";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

const reorderInputSchema = z.object({
  orderings: z
    .array(
      z.object({
        id: z.string().cuid(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1, "Provide at least one ordering")
    .max(200, "Too many orderings in one request"),
});

/**
 * PATCH /api/events/[id]/gallery/[galleryId]/items/reorder
 *
 * Bulk-updates `sort_order` on a set of items. Body shape:
 *   { orderings: [{ id, sortOrder }, ...] }
 *
 * The dashboard can send either the full list or a partial subset (the
 * up/down-arrow UX sends pairs of swaps). All updates run in a single
 * transaction so a partial failure rolls back. Items not belonging to
 * the gallery are rejected — guards against a stale list from another
 * gallery being submitted by mistake.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await request.json().catch(() => ({}));
    const input = reorderInputSchema.parse(body);

    const gallery = await db.eventGallery.findFirst({
      where: { id: galleryId, eventId },
      select: { id: true, event: { select: { slug: true } } },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    // Verify every id belongs to this gallery before mutating. One round-trip.
    const ids = input.orderings.map((o) => o.id);
    const owned = await db.eventGalleryItem.findMany({
      where: { id: { in: ids }, galleryId },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      throw new ValidationError(
        "One or more items don't belong to this gallery",
      );
    }

    await db.$transaction(
      input.orderings.map((o) =>
        db.eventGalleryItem.update({
          where: { id: o.id },
          data: { sortOrder: o.sortOrder },
        }),
      ),
    );

    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ updated: input.orderings.length });
  } catch (error) {
    return handleApiError(error);
  }
}
