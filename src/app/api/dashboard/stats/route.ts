import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";

/**
 * GET /api/dashboard/stats
 *
 * Returns aggregate statistics for the authenticated user's events.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Get aggregate stats in parallel
    const [
      totalEvents,
      publishedEvents,
      totalInvites,
      totalRsvps,
      yesRsvps,
    ] = await Promise.all([
      // Total events created by user
      db.event.count({
        where: { creatorId: user.id },
      }),

      // Published events
      db.event.count({
        where: {
          creatorId: user.id,
          status: "PUBLISHED",
        },
      }),

      // Total invites across all user's events
      db.invite.count({
        where: {
          event: { creatorId: user.id },
        },
      }),

      // Total RSVPs across all user's events
      db.rSVP.count({
        where: {
          event: { creatorId: user.id },
        },
      }),

      // Yes RSVPs (confirmed attendees)
      db.rSVP.count({
        where: {
          event: { creatorId: user.id },
          response: "YES",
        },
      }),
    ]);

    return successResponse({
      totalEvents,
      publishedEvents,
      draftEvents: totalEvents - publishedEvents,
      totalInvites,
      totalRsvps,
      yesRsvps,
      responseRate: totalInvites > 0 ? Math.round((totalRsvps / totalInvites) * 100) : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
