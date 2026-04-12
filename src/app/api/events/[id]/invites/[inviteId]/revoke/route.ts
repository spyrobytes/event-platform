import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string; inviteId: string }>;
};

/**
 * POST /api/events/[id]/invites/[inviteId]/revoke
 * Revoke an invite (owner only).
 * Preserves existing RSVP data for audit purposes.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId, inviteId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const invite = await db.invite.findUnique({
      where: { id: inviteId },
      select: { id: true, eventId: true, status: true },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found");
    }

    if (invite.status === "REVOKED") {
      throw new ValidationError("This invite has already been revoked");
    }

    const updated = await db.invite.update({
      where: { id: inviteId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        status: true,
        revokedAt: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
