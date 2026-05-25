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
import { revalidateEventAndGallery } from "@/lib/revalidation";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { enqueueGalleryPublishedEmails } from "@/lib/gallery-email";
import { getPublishedGalleryForEvent } from "@/lib/gallery-data";

type RouteContext = {
  params: Promise<{ id: string; galleryId: string }>;
};

const publishInputSchema = z.object({
  /** Opt-in: when true, queue a GALLERY_PUBLISHED broadcast to RSVPed-yes
   *  invites. Default false — organizers may share the gallery out-of-band. */
  notifyGuests: z.boolean().optional(),
});

/**
 * POST /api/events/[id]/gallery/[galleryId]/publish
 *
 * Flip a gallery to PUBLISHED. External-link galleries publish immediately;
 * native galleries additionally require ≥1 READY item.
 *
 * Body `{ notifyGuests: true }` triggers a GALLERY_PUBLISHED email
 * broadcast (PR #8). One outbox row per RSVPed-yes, non-unsubscribed
 * invite. The email worker's existing cron picks them up.
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

    const body = await request.json().catch(() => ({}));
    const input = publishInputSchema.parse(body);

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
        event: {
          select: {
            slug: true,
            title: true,
            creator: { select: { name: true, email: true } },
          },
        },
      },
    });

    await revalidateEventAndGallery(updated.event.slug);

    // Email broadcast — only when the organizer opted in. Best-effort:
    // a failure here doesn't roll back the publish (the gallery is live
    // either way; the worst case is the organizer needs to re-trigger).
    let emailResult: { enqueued: number; skipped: number } | null = null;
    if (input.notifyGuests) {
      try {
        // Fetch the public-shape payload so the email can include the
        // resolved cover URL + ready-photo count without re-running the
        // resolver. Read after the publish update so the cover reflects
        // any in-flight changes.
        const publicGallery = await getPublishedGalleryForEvent(eventId);
        const photoCount =
          publicGallery?.sourceType === "NATIVE"
            ? publicGallery.items.length
            : undefined;
        emailResult = await enqueueGalleryPublishedEmails({
          eventId,
          galleryId: updated.id,
          eventSlug: updated.event.slug,
          eventTitle: updated.event.title,
          hostName:
            updated.event.creator.name ||
            updated.event.creator.email ||
            "Your host",
          coverUrl: publicGallery?.coverUrl ?? null,
          photoCount,
        });
      } catch (err) {
        // Log but don't fail the publish. Organizer can re-trigger the
        // broadcast later (out of scope for PR #8 — would need a small
        // dashboard action; today they could re-publish to retrigger).
        console.error("[gallery publish] email broadcast failed", err);
      }
    }

    return successResponse({
      id: updated.id,
      status: updated.status,
      publishedAt: updated.publishedAt,
      emailsQueued: emailResult?.enqueued ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
