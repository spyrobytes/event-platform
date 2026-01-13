import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { updateEventSchema } from "@/schemas/event";
import { NotFoundError } from "@/lib/errors";

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

    const body = await request.json();
    const data = updateEventSchema.parse(body);

    const event = await db.event.update({
      where: { id },
      data,
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

    await db.event.delete({ where: { id } });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
