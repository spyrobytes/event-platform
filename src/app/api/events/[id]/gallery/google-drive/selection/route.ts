import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { GALLERY_LIMITS } from "@/lib/gallery-config";
import {
  googleDriveSelectionInputSchema,
  type GoogleDrivePickedFile,
} from "@/schemas/gallery";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const IMAGE_MIME_PREFIX = "image/";

/**
 * POST /api/events/[id]/gallery/google-drive/selection
 *
 * Accepts file metadata from the Google Picker and persists it as PENDING
 * `event_gallery_items` plus a QUEUED `gallery_import_jobs` row. Reuses
 * the existing gallery row for the event if present (creates one set to
 * SYNCING otherwise). The worker (PR #5) picks up PENDING items on its
 * cron interval and does the actual download + transcode.
 *
 * Enforces three caps from GALLERY_LIMITS:
 *   - maxImagesPerGallery: total of existing + new
 *   - maxConcurrentJobsPerEvent: blocks while a job is QUEUED/PROCESSING
 *   - maxImportsPerEventPerDay: counted from gallery_import_jobs.created_at
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const body = await request.json().catch(() => ({}));
    const input = googleDriveSelectionInputSchema.parse(body);

    // Filter to allowed-MIME images on the way in. We could throw on
    // mixed selections, but a soft filter is friendlier — organizers who
    // accidentally include a PDF still get all their photos imported.
    // Skipped files are surfaced in the response so the UI can warn.
    const supported: GoogleDrivePickedFile[] = [];
    const skipped: { id: string; name: string; reason: string }[] = [];
    for (const file of input.files) {
      if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
        skipped.push({ id: file.id, name: file.name, reason: "NOT_AN_IMAGE" });
        continue;
      }
      if (
        !(GALLERY_LIMITS.allowedMimeTypes as readonly string[]).includes(
          file.mimeType,
        )
      ) {
        skipped.push({
          id: file.id,
          name: file.name,
          reason: "UNSUPPORTED_MIME_TYPE",
        });
        continue;
      }
      if (
        file.sizeBytes !== undefined &&
        file.sizeBytes > GALLERY_LIMITS.maxImageBytes
      ) {
        skipped.push({ id: file.id, name: file.name, reason: "FILE_TOO_LARGE" });
        continue;
      }
      supported.push(file);
    }

    if (supported.length === 0) {
      throw new ValidationError(
        "None of the selected files are supported image types (JPEG, PNG, or WebP under 10 MB).",
      );
    }

    // Concurrent-job cap. Block here so two Picker submits in quick
    // succession don't both create jobs that fight over the same items.
    const activeJob = await db.galleryImportJob.findFirst({
      where: {
        eventId,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      select: { id: true },
    });
    if (activeJob) {
      throw new ValidationError(
        "An import is already in progress for this event. Wait for it to finish before starting another.",
      );
    }

    // Daily-import cap. UTC day boundary keeps the math simple and
    // matches the project_premium_tier_caps comment on the limit.
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    const todayCount = await db.galleryImportJob.count({
      where: { eventId, createdAt: { gte: startOfUtcDay } },
    });
    if (todayCount >= GALLERY_LIMITS.maxImportsPerEventPerDay) {
      throw new ValidationError(
        `You've reached the daily import limit (${GALLERY_LIMITS.maxImportsPerEventPerDay}). Try again tomorrow.`,
      );
    }

    // Find or create the gallery row. A second connected import on an
    // event that already has an EXTERNAL_LINK gallery is a deliberate
    // hand-off; we flip sourceType to GOOGLE_DRIVE so the public route
    // renders the native variant in PR #6.
    const existingGallery = await db.eventGallery.findFirst({
      where: { eventId },
      select: { id: true, status: true },
    });

    const existingItemCount = existingGallery
      ? await db.eventGalleryItem.count({ where: { galleryId: existingGallery.id } })
      : 0;
    const wouldBeTotal = existingItemCount + supported.length;
    if (wouldBeTotal > GALLERY_LIMITS.maxImagesPerGallery) {
      throw new ValidationError(
        `This gallery can hold up to ${GALLERY_LIMITS.maxImagesPerGallery} photos (currently ${existingItemCount}). Select fewer files.`,
      );
    }

    const result = await db.$transaction(async (tx) => {
      const gallery = existingGallery
        ? await tx.eventGallery.update({
            where: { id: existingGallery.id },
            data: {
              sourceType: "GOOGLE_DRIVE",
              sourceRef: {
                kind: "GOOGLE_DRIVE",
                pickedAt: new Date().toISOString(),
              },
              // SYNCING signals "items being imported" — flips to READY
              // once any item lands. Don't touch PUBLISHED galleries.
              ...(existingGallery.status === "PUBLISHED"
                ? {}
                : { status: "SYNCING" as const }),
            },
            select: { id: true, status: true },
          })
        : await tx.eventGallery.create({
            data: {
              eventId,
              sourceType: "GOOGLE_DRIVE",
              sourceRef: {
                kind: "GOOGLE_DRIVE",
                pickedAt: new Date().toISOString(),
              },
              status: "SYNCING",
            },
            select: { id: true, status: true },
          });

      const startingSortOrder = existingItemCount;
      await tx.eventGalleryItem.createMany({
        data: supported.map((file, idx) => ({
          galleryId: gallery.id,
          sourceProvider: "GOOGLE_DRIVE" as const,
          sourceFileId: file.id,
          originalName: file.name,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          sortOrder: startingSortOrder + idx,
          status: "PENDING" as const,
        })),
      });

      const job = await tx.galleryImportJob.create({
        data: {
          eventId,
          galleryId: gallery.id,
          initiatedBy: user.id,
          provider: "GOOGLE_DRIVE",
          status: "QUEUED",
          totalItems: supported.length,
        },
        select: { id: true, status: true, totalItems: true },
      });

      return { gallery, job };
    });

    return successResponse(
      {
        galleryId: result.gallery.id,
        jobId: result.job.id,
        accepted: supported.length,
        skipped,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
