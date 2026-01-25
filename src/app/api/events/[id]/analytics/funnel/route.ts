import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { buildFunnelData, type FunnelData } from "@/lib/analytics";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/analytics/funnel
 *
 * Returns RSVP funnel data for an event.
 * Tracks: Invited → Opened → Responded
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

    // Get funnel counts in parallel
    const [totalInvited, totalOpened, totalResponded] = await Promise.all([
      // Stage 1: Total invites
      db.invite.count({
        where: { eventId },
      }),

      // Stage 2: Invites that were opened
      db.invite.count({
        where: {
          eventId,
          openedAt: { not: null },
        },
      }),

      // Stage 3: Total RSVPs (any response)
      db.rSVP.count({
        where: { eventId },
      }),
    ]);

    const funnelData: FunnelData = buildFunnelData(
      totalInvited,
      totalOpened,
      totalResponded
    );

    return successResponse(funnelData);
  } catch (error) {
    return handleApiError(error);
  }
}
