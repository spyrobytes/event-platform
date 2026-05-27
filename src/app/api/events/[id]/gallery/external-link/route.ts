import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { revalidateEventAndGallery } from "@/lib/revalidation";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { deleteGalleryItemBlobs } from "@/lib/gallery-storage";
import {
  upsertExternalLinkInputSchema,
  externalLinkSourceRefSchema,
} from "@/schemas/gallery";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/gallery/external-link
 *
 * Upserts the (single) post-event gallery for an event with an external
 * link source. Creates the row if no gallery exists for the event, replaces
 * the source on the existing row otherwise. `publish=true` flips status
 * to PUBLISHED in the same call. Always revalidates both the event page
 * and the dedicated gallery route on success.
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
    const input = upsertExternalLinkInputSchema.parse(body);

    const { slug } = await db.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { slug: true },
    });

    const existing = await db.eventGallery.findFirst({
      where: { eventId },
      select: {
        id: true,
        status: true,
        sourceType: true,
        items: {
          select: {
            id: true,
            storageBucket: true,
            storageKey: true,
            thumbnailKey: true,
          },
        },
      },
    });

    // Re-validate through the discriminated union before writing to the JSON
    // column. The input is already validated, but parsing here is the
    // single chokepoint that enforces the schema-comment contract: "any code
    // path that mutates source_ref MUST validate through gallerySourceRefSchema".
    const sourceRef = externalLinkSourceRefSchema.parse({
      kind: "EXTERNAL_LINK",
      url: input.url,
      ...(input.ctaLabel ? { ctaLabel: input.ctaLabel } : {}),
    });
    const targetStatus = input.publish
      ? "PUBLISHED"
      : existing?.status === "PUBLISHED"
        ? "PUBLISHED"
        : "DRAFT";

    // Source-type switch (NATIVE → EXTERNAL_LINK) leaves orphan rows + blobs
    // behind otherwise: items become unreachable in the dashboard, still
    // consume storage, and still count against future Drive-import caps via
    // existingItemCount in selection/route.ts. Clean them up before flipping
    // the source. Best-effort on storage (same pattern as gallery DELETE).
    const switchingFromNative =
      !!existing &&
      existing.sourceType !== "EXTERNAL_LINK" &&
      existing.items.length > 0;
    if (switchingFromNative && existing) {
      const storage = await deleteGalleryItemBlobs(
        existing.items.map((i) => ({
          bucket: i.storageBucket,
          storageKey: i.storageKey,
          thumbnailKey: i.thumbnailKey,
        })),
      );
      if (storage.failed > 0) {
        console.error(
          "[gallery external-link upsert] storage cleanup partial failure",
          { galleryId: existing.id, ...storage },
        );
        return errorResponse(
          "Could not remove existing photos. Please try again.",
          500,
          "STORAGE_DELETE_FAILED",
          storage.errors,
        );
      }
    }

    const gallery = existing
      ? await db.$transaction(async (tx) => {
          // Drop the now-orphan native items first (FK cascade isn't enough —
          // we want them gone before the source flips so a concurrent read
          // doesn't observe an EXTERNAL_LINK gallery with leftover rows).
          if (switchingFromNative) {
            await tx.eventGalleryItem.deleteMany({
              where: { galleryId: existing.id },
            });
          }
          return tx.eventGallery.update({
            where: { id: existing.id },
            data: {
              title: input.title ?? null,
              description: input.description ?? null,
              sourceType: "EXTERNAL_LINK",
              sourceRef,
              status: targetStatus,
              // Only touch the cover when the caller passes the key
              // explicitly (undefined = leave, null = clear, string = set).
              ...(input.coverMediaAssetId !== undefined
                ? { coverMediaAssetId: input.coverMediaAssetId }
                : {}),
              // External-link galleries have no items, so an existing gallery
              // item cover reference is stale once the source flips.
              ...(switchingFromNative ? { coverGalleryItemId: null } : {}),
              publishedAt:
                targetStatus === "PUBLISHED" && existing.status !== "PUBLISHED"
                  ? new Date()
                  : undefined,
            },
          });
        })
      : await db.eventGallery.create({
          data: {
            eventId,
            title: input.title ?? null,
            description: input.description ?? null,
            sourceType: "EXTERNAL_LINK",
            sourceRef,
            status: targetStatus,
            coverMediaAssetId: input.coverMediaAssetId ?? null,
            publishedAt: targetStatus === "PUBLISHED" ? new Date() : null,
          },
        });

    await revalidateEventAndGallery(slug);

    return successResponse(
      {
        id: gallery.id,
        status: gallery.status,
        sourceType: gallery.sourceType,
        title: gallery.title,
        description: gallery.description,
        publishedAt: gallery.publishedAt,
      },
      existing ? 200 : 201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
