import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { buildAnalyticsSnapshot, type RSVPStats, type InviteStats } from "@/lib/analytics";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/analytics/snapshot
 *
 * Returns aggregated analytics metrics for an event.
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

    // Single optimized query to get all metrics
    const [event, rsvpStats, inviteStats] = await Promise.all([
      // Get event start date
      db.event.findUnique({
        where: { id: eventId },
        select: {
          startAt: true,
        },
      }),

      // Get RSVP statistics grouped by response
      db.rSVP.groupBy({
        by: ["response"],
        where: { eventId },
        _count: { response: true },
        _sum: { guestCount: true },
      }),

      // Get invite statistics
      db.invite.aggregate({
        where: { eventId },
        _count: { id: true },
      }).then(async (total) => {
        const opened = await db.invite.count({
          where: {
            eventId,
            openedAt: { not: null },
          },
        });
        return { total: total._count.id, opened };
      }),
    ]);

    if (!event) {
      return errorResponse("Event not found", 404, "NOT_FOUND");
    }

    // Transform RSVP stats into structured format
    const rsvpByResponse = rsvpStats.reduce(
      (acc, stat) => {
        acc[stat.response] = {
          count: stat._count.response,
          guests: stat._sum.guestCount || 0,
        };
        return acc;
      },
      {} as Record<string, { count: number; guests: number }>
    );

    const structuredRsvpStats: RSVPStats = {
      yes: rsvpByResponse["YES"] || { count: 0, guests: 0 },
      maybe: rsvpByResponse["MAYBE"] || { count: 0, guests: 0 },
      no: rsvpByResponse["NO"] || { count: 0, guests: 0 },
    };

    const structuredInviteStats: InviteStats = {
      total: inviteStats.total,
      opened: inviteStats.opened,
    };

    const snapshot = buildAnalyticsSnapshot(
      structuredRsvpStats,
      structuredInviteStats,
      new Date(event.startAt)
    );

    return successResponse(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
