import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { hashToken } from "@/lib/tokens";
import { NotFoundError } from "@/lib/errors";

/**
 * GET /api/invites/lookup?token=xxx
 * Look up an invite by token (public endpoint for RSVP page)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("Token is required", 400, "MISSING_TOKEN");
    }

    const tokenHash = hashToken(token);

    const invite = await db.invite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        plusOnesAllowed: true,
        expiresAt: true,
        event: {
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
            coverImageUrl: true,
            status: true,
            maxAttendees: true,
            creator: {
              select: { name: true },
            },
            organization: {
              select: { name: true },
            },
            _count: {
              select: {
                rsvps: { where: { response: "YES" } },
              },
            },
          },
        },
        rsvp: {
          select: {
            id: true,
            response: true,
            guestName: true,
            guestCount: true,
            notes: true,
            respondedAt: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError("Invite not found or has expired");
    }

    // Check if invite has expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      // Update status to expired
      await db.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });

      throw new NotFoundError("This invite has expired");
    }

    // Check if event is still valid
    if (invite.event.status === "CANCELLED") {
      return errorResponse("This event has been cancelled", 400, "EVENT_CANCELLED");
    }

    // Mark invite as opened if not already responded
    if (invite.status === "SENT" || invite.status === "PENDING") {
      await db.invite.update({
        where: { id: invite.id },
        data: {
          status: "OPENED",
          openedAt: new Date(),
        },
      });
    }

    return successResponse({
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        status: invite.status,
        plusOnesAllowed: invite.plusOnesAllowed,
        hasResponded: !!invite.rsvp,
        existingRsvp: invite.rsvp,
      },
      event: invite.event,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
