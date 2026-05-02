import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { updateEventSchema } from "@/schemas/event";
import { NotFoundError } from "@/lib/errors";
import { revalidateEventPage } from "@/lib/revalidation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]
 * Get event details (owner only for drafts)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    const event = await db.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: {
          select: {
            invites: true,
            rsvps: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check access for non-published events
    if (event.status !== "PUBLISHED" || event.visibility === "PRIVATE") {
      if (!user) {
        return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
      }
      await requireEventOwner(id, user.id);
    }

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/events/[id]
 * Update an event (owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);
    assertCanMutate(user);

    const body = await request.json();
    const data = updateEventSchema.parse(body);

    // Slug rename has special handling: history insert + uniqueness check.
    // Strip slug from `data` so the generic update doesn't touch it; the
    // transaction below applies the new slug only after the history row exists.
    const { slug: requestedSlug, ...restData } = data;

    let renameInfo: { from: string; to: string } | null = null;
    if (requestedSlug !== undefined) {
      const current = await db.event.findUnique({
        where: { id },
        select: { slug: true, slugLockedAt: true },
      });
      if (!current) throw new NotFoundError("Event not found");

      if (requestedSlug !== current.slug) {
        if (current.slugLockedAt) {
          return errorResponse(
            "This event's URL is locked and can no longer be changed.",
            409,
            "SLUG_LOCKED"
          );
        }

        // Friendly pre-check so the common case returns 409 instead of
        // tripping the unique-constraint error from Prisma. The transaction
        // below still catches P2002 to handle races.
        const [activeMatch, historyMatch] = await Promise.all([
          db.event.findUnique({
            where: { slug: requestedSlug },
            select: { id: true },
          }),
          db.eventSlugHistory.findUnique({
            where: { slug: requestedSlug },
            select: { eventId: true },
          }),
        ]);
        if (
          (activeMatch && activeMatch.id !== id) ||
          (historyMatch && historyMatch.eventId !== id)
        ) {
          return errorResponse(
            "That URL is already taken by another event.",
            409,
            "SLUG_TAKEN"
          );
        }
        renameInfo = { from: current.slug, to: requestedSlug };
      }
    }

    let event;
    try {
      event = await db.$transaction(async (tx) => {
        if (renameInfo) {
          // Upsert handles A→B→A cycles: if "from" is already in history for
          // this event, we just no-op rather than colliding on the unique slug.
          await tx.eventSlugHistory.upsert({
            where: { slug: renameInfo.from },
            create: { eventId: id, slug: renameInfo.from },
            update: { eventId: id },
          });
        }
        return tx.event.update({
          where: { id },
          data: {
            ...restData,
            ...(renameInfo ? { slug: renameInfo.to } : {}),
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            startAt: true,
            endAt: true,
            timezone: true,
            venueName: true,
            address: true,
            city: true,
            country: true,
            visibility: true,
            status: true,
            coverImageUrl: true,
            maxAttendees: true,
            updatedAt: true,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return errorResponse(
          "That URL was just claimed by another event. Please try a different one.",
          409,
          "SLUG_TAKEN"
        );
      }
      throw err;
    }

    if (renameInfo) {
      // Bust any cached responses for the old + new path. The /e routes are
      // currently force-dynamic, but other surfaces (sitemaps, dashboards)
      // may cache slugs and benefit from the bump.
      await Promise.all([
        revalidateEventPage(renameInfo.from),
        revalidateEventPage(renameInfo.to),
      ]);
    }

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event (owner only)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);
    assertCanMutate(user);

    await db.event.delete({ where: { id } });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
