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

const setCoverInputSchema = z
  .object({
    galleryItemId: z.string().cuid().nullable().optional(),
    mediaAssetId: z.string().cuid().nullable().optional(),
  })
  .refine(
    (v) => v.galleryItemId !== undefined || v.mediaAssetId !== undefined,
    { message: "Provide galleryItemId or mediaAssetId (one may be null to clear)" },
  );

/**
 * PATCH /api/events/[id]/gallery/[galleryId]/cover
 *
 * Sets the gallery's cover. Two channels per the schema design (§8.2):
 *   - `galleryItemId` — soft reference to an EventGalleryItem (no FK)
 *   - `mediaAssetId` — FK to a MediaAsset (e.g. a hero asset)
 * Either may be null to clear that channel. The cover resolver in
 * src/lib/gallery-cover.ts walks the priority order at read time.
 *
 * Setting `galleryItemId` to a non-READY item is rejected — the public
 * payload wouldn't render it anyway and it'd be a confusing dashboard
 * state. Setting to null is always fine.
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
    const input = setCoverInputSchema.parse(body);

    const gallery = await db.eventGallery.findFirst({
      where: { id: galleryId, eventId },
      select: { id: true, event: { select: { slug: true } } },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    // Validate the galleryItem reference if non-null: must belong to
    // this gallery AND be READY + visible (the public payload won't
    // render anything else).
    if (input.galleryItemId) {
      const item = await db.eventGalleryItem.findFirst({
        where: {
          id: input.galleryItemId,
          galleryId,
          status: "READY",
          isHidden: false,
        },
        select: { id: true },
      });
      if (!item) {
        throw new ValidationError(
          "Cover item must belong to this gallery and be READY + visible",
        );
      }
    }

    // Validate the MediaAsset reference if non-null: must belong to
    // the same event.
    if (input.mediaAssetId) {
      const asset = await db.mediaAsset.findFirst({
        where: { id: input.mediaAssetId, eventId },
        select: { id: true },
      });
      if (!asset) {
        throw new ValidationError("Cover asset must belong to this event");
      }
    }

    const data: {
      coverGalleryItemId?: string | null;
      coverMediaAssetId?: string | null;
    } = {};
    if (input.galleryItemId !== undefined) {
      data.coverGalleryItemId = input.galleryItemId;
    }
    if (input.mediaAssetId !== undefined) {
      data.coverMediaAssetId = input.mediaAssetId;
    }

    await db.eventGallery.update({
      where: { id: galleryId },
      data,
    });

    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ id: galleryId, ...data });
  } catch (error) {
    return handleApiError(error);
  }
}
