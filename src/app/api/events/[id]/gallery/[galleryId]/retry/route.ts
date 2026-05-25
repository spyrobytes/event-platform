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
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { revalidateEventAndGallery } from "@/lib/revalidation";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

/**
 * POST /api/events/[id]/gallery/[galleryId]/retry
 *
 * Resets every FAILED item in the gallery back to PENDING with
 * attempts=0 so the worker (PR #5) re-imports them on its next tick.
 * Does NOT touch SKIPPED items (HEIC + similar are terminal-by-design —
 * the organizer fixes the source file, not the retry button).
 *
 * Also drops the gallery's open job to FAILED→QUEUED if one exists, so
 * the dashboard's progress UI flips back to "Queued" rather than
 * showing stale completed counts.
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
      select: { id: true, event: { select: { slug: true } } },
    });
    if (!gallery) throw new NotFoundError("Gallery not found");

    const reset = await db.eventGalleryItem.updateMany({
      where: { galleryId, status: "FAILED" },
      data: {
        status: "PENDING",
        attempts: 0,
        errorCode: null,
        errorMessage: null,
        lockedAt: null,
      },
    });

    if (reset.count > 0) {
      // Re-open the most recent job so the dashboard polling picks it
      // up. If there's no recent job we just leave the items PENDING —
      // the worker can still find them on its claim query (it reads
      // items, not jobs).
      const job = await db.galleryImportJob.findFirst({
        where: { galleryId, status: { in: ["COMPLETED", "PARTIAL", "FAILED"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (job) {
        await db.galleryImportJob.update({
          where: { id: job.id },
          data: {
            status: "QUEUED",
            startedAt: null,
            completedAt: null,
            errorCode: null,
            errorMessage: null,
          },
        });
      }
    }

    await revalidateEventAndGallery(gallery.event.slug);

    return successResponse({ retried: reset.count });
  } catch (error) {
    return handleApiError(error);
  }
}
