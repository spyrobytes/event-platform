import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import {
  buildFunnelData,
  buildExtendedFunnelData,
  type FunnelData,
} from "@/lib/analytics";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/analytics/funnel
 *
 * Returns RSVP funnel data for an event.
 *
 * Basic funnel (3 stages): Invited → Opened → Responded
 * Extended funnel (5 stages): Invited → Opened → Page Viewed → Form Started → Responded
 *
 * The extended funnel is returned when client-side tracking data exists.
 * Use ?extended=true to force extended funnel (shows 0 for stages without data).
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

    // Check if extended funnel is requested
    const url = new URL(request.url);
    const forceExtended = url.searchParams.get("extended") === "true";

    // Get basic funnel counts in parallel
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

      // Stage 5: Total RSVPs (any response)
      db.rSVP.count({
        where: { eventId },
      }),
    ]);

    // Check if we have any tracking data for extended funnel
    const hasTrackingData = await db.analyticsEvent.findFirst({
      where: { eventId },
      select: { id: true },
    });

    // Use extended funnel if we have tracking data or if explicitly requested
    if (hasTrackingData || forceExtended) {
      // Get extended funnel counts (unique sessions for page views and form starts)
      const [pageViewSessions, formStartSessions] = await Promise.all([
        // Stage 3: Unique sessions that viewed the page
        db.analyticsEvent.groupBy({
          by: ["sessionId"],
          where: {
            eventId,
            type: "page_view",
          },
        }),

        // Stage 4: Unique sessions that started the form
        db.analyticsEvent.groupBy({
          by: ["sessionId"],
          where: {
            eventId,
            type: "rsvp_form_started",
          },
        }),
      ]);

      const totalPageViewed = pageViewSessions.length;
      const totalFormStarted = formStartSessions.length;

      const funnelData: FunnelData = buildExtendedFunnelData(
        totalInvited,
        totalOpened,
        totalPageViewed,
        totalFormStarted,
        totalResponded
      );

      return successResponse(funnelData);
    }

    // Return basic 3-stage funnel
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
