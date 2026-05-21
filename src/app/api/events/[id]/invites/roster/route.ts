import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/invites/roster
 * Returns the confirmed-attending guest list for the printable day-of roster.
 * Filter is strictly `rsvp.response === "YES"` — no MAYBE bleed-through.
 * Ordered by seat assignment ASC (Postgres NULLS LAST is the default), then guest name.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { title: true, startAt: true, timezone: true },
    });

    const invites = await db.invite.findMany({
      where: {
        eventId,
        rsvp: { response: "YES" },
      },
      select: {
        id: true,
        name: true,
        seatAssignment: true,
        plannerNotes: true,
        rsvp: {
          select: {
            guestName: true,
            guestCount: true,
            additionalGuestNames: true,
            dietaryRestrictions: true,
            musicSuggestions: true,
            side: true,
          },
        },
      },
      orderBy: [{ seatAssignment: "asc" }, { name: "asc" }],
    });

    return successResponse({ event, invites });
  } catch (error) {
    return handleApiError(error);
  }
}
