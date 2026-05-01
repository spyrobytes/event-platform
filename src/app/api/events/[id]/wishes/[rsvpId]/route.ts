import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string; rsvpId: string }>;
};

const patchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "HIDDEN"]),
});

/**
 * PATCH /api/events/[id]/wishes/[rsvpId]
 * Organizer flips a wedding-wish message between PENDING / APPROVED / HIDDEN.
 * Stamps `messageApprovedAt` only when transitioning to APPROVED; clears it
 * otherwise so a re-edited message that gets re-pended doesn't leak its
 * earlier approval timestamp.
 *
 * Refuses to act on RSVPs that have no message — there's nothing to moderate.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId, rsvpId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const body = await request.json();
    const { status } = patchSchema.parse(body);

    const rsvp = await db.rSVP.findUnique({
      where: { id: rsvpId },
      select: { id: true, eventId: true, messageToHost: true },
    });

    if (!rsvp || rsvp.eventId !== eventId) {
      throw new NotFoundError("Message not found");
    }

    if (!rsvp.messageToHost) {
      throw new ValidationError("This RSVP has no message to moderate");
    }

    const updated = await db.rSVP.update({
      where: { id: rsvpId },
      data: {
        messageStatus: status,
        messageApprovedAt: status === "APPROVED" ? new Date() : null,
      },
      select: {
        id: true,
        messageStatus: true,
        messageApprovedAt: true,
      },
    });

    return successResponse({ message: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
