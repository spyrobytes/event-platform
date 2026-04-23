import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { updateInvitePlanningSchema } from "@/schemas/invite";

type RouteContext = {
  params: Promise<{ id: string; inviteId: string }>;
};

/**
 * PATCH /api/events/[id]/invites/[inviteId]
 * Update planning fields on a single invite (event owner only).
 * Scope is strictly limited to `seatAssignment` and `plannerNotes`; any other
 * field in the body is rejected by the Zod schema. `undefined` leaves a field
 * unchanged, explicit `null` clears it.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId, inviteId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);
    assertCanMutate(user);

    const body = await request.json();
    const data = updateInvitePlanningSchema.parse(body);

    const invite = await db.invite.findUnique({
      where: { id: inviteId },
      select: { id: true, eventId: true },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found");
    }

    const updated = await db.invite.update({
      where: { id: inviteId },
      data: {
        seatAssignment: data.seatAssignment,
        plannerNotes: data.plannerNotes,
      },
      select: {
        id: true,
        seatAssignment: true,
        plannerNotes: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
