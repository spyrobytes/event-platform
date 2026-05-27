import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
import {
  parseGalleryPresentation,
  updateGalleryInputSchema,
} from "@/schemas/gallery";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

/**
 * PATCH /api/events/[id]/gallery/[galleryId]
 *
 * Gallery-level field updates: title, description, presentation. Only
 * fields explicitly present in the body are touched; `null` (or
 * empty/whitespace string) clears title/description, `undefined` leaves
 * the column alone.
 *
 * Presentation is MERGED into the existing column when an object is
 * provided — sending `{ presentation: { variant: "scrapbook-memories" } }`
 * keeps any previously-saved `showFeaturedStrip`/`thankYouMessage`/etc.
 * Pass `presentation: null` to reset the column to NULL (public reads
 * fall back to DEFAULT_GALLERY_PRESENTATION).
 *
 * The write uses `updateMany` scoped by `(id, eventId)` so the
 * event-ownership guard is enforced atomically with the write — a row
 * deleted between fetching the slug and writing surfaces as 404, not
 * 500.
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
    const input = updateGalleryInputSchema.parse(body);

    // Load the slug for revalidation + the existing presentation for the
    // partial-merge path. Done as one round-trip so the merge has fresh
    // state without a separate read.
    const gallery = await db.eventGallery.findFirst({
      where: { id: galleryId, eventId },
      select: {
        id: true,
        presentation: true,
        event: { select: { slug: true } },
      },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    const data: Prisma.EventGalleryUpdateInput = {};
    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.presentation !== undefined) {
      if (input.presentation === null) {
        // Explicit reset — Prisma.DbNull writes SQL NULL on a nullable Json
        // column (JsonNull would write the literal JSON value `null`).
        data.presentation = Prisma.DbNull;
      } else {
        // Partial merge against the existing presentation. parseGalleryPresentation
        // returns the default shape for null/invalid stored values, so the
        // merge always operates on a fully-formed object — the patch fields
        // only overwrite what the client explicitly sent.
        const existing = parseGalleryPresentation(gallery.presentation);
        data.presentation = { ...existing, ...input.presentation };
      }
    }

    // Atomic eventId guard via the compound where. count=0 means the row
    // disappeared between the load above and this write (concurrent
    // DELETE) — surface that as 404 instead of letting Prisma's P2025
    // bubble to a generic 500.
    const result = await db.eventGallery.updateMany({
      where: { id: galleryId, eventId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundError("Gallery not found");
    }

    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ id: galleryId, updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}

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
