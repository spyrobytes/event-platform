import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { publishEventSchema } from "@/schemas/event";
import { NotFoundError, ValidationError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/publish
 * Publish an event (owner only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);

    // Get current event to validate
    const currentEvent = await db.event.findUnique({
      where: { id },
      select: {
        status: true,
        title: true,
        startAt: true,
      },
    });

    if (!currentEvent) {
      throw new NotFoundError("Event not found");
    }

    // Validate event can be published
    if (currentEvent.status === "PUBLISHED") {
      throw new ValidationError("Event is already published");
    }

    if (currentEvent.status === "CANCELLED") {
      throw new ValidationError("Cannot publish a cancelled event");
    }

    if (!currentEvent.title || !currentEvent.startAt) {
      throw new ValidationError("Event must have a title and start date to be published");
    }

    if (currentEvent.startAt < new Date()) {
      throw new ValidationError("Cannot publish an event with a start date in the past");
    }

    // Parse optional publish data
    const body = await request.json().catch(() => ({}));
    const data = publishEventSchema.parse(body);

    const event = await db.event.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: data.publishedAt ?? new Date(),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        visibility: true,
        publishedAt: true,
        startAt: true,
        endAt: true,
      },
    });

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}
