import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { buildVelocityData, type VelocityData } from "@/lib/analytics";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/analytics/velocity
 *
 * Returns RSVP velocity data for an event.
 * Shows daily RSVP counts over the past 30 days and momentum trends.
 *
 * Requires event ownership.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return errorResponse("Event not found", 404, "NOT_FOUND");
    }

    // Get all RSVP dates for velocity calculation
    const rsvps = await db.rSVP.findMany({
      where: { eventId },
      select: { respondedAt: true },
      orderBy: { respondedAt: "asc" },
    });

    const rsvpDates = rsvps.map((r) => r.respondedAt);
    const now = new Date();

    const velocityData: VelocityData = buildVelocityData(rsvpDates, now, 30);

    return successResponse(velocityData);
  } catch (error) {
    return handleApiError(error);
  }
}
