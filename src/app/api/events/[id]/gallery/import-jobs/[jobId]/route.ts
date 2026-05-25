import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";

type RouteContext = {
  params: Promise<{ id: string; jobId: string }>;
};

/**
 * GET /api/events/[id]/gallery/import-jobs/[jobId]
 *
 * Returns the current state of an import job for dashboard polling.
 * Counts are aggregated from event_gallery_items (not from the job row's
 * processedItems/failedItems fields, which the worker updates batch-by-
 * batch) so the dashboard sees fresh numbers even between worker ticks.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId, jobId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const job = await db.galleryImportJob.findFirst({
      where: { id: jobId, eventId },
      select: {
        id: true,
        galleryId: true,
        status: true,
        totalItems: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (!job) throw new NotFoundError("Import job not found");

    // Aggregate item counts off the items table so polling reflects the
    // worker's last partial progress even mid-cron-tick.
    const itemCounts = await db.eventGalleryItem.groupBy({
      by: ["status"],
      where: { galleryId: job.galleryId },
      _count: { _all: true },
    });
    const counts = itemCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return successResponse({
      id: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: counts.READY ?? 0,
      failedItems: counts.FAILED ?? 0,
      skippedItems: counts.SKIPPED ?? 0,
      pendingItems: (counts.PENDING ?? 0) + (counts.IMPORTING ?? 0),
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
