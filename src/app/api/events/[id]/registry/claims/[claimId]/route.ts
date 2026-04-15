import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { verifyAuth } from "@/lib/auth";
import { verifyEventOwnership } from "@/lib/authorization";
import { hashToken } from "@/lib/tokens";
import { deleteClaimSchema } from "@/schemas/registry-claim";

const patchClaimSchema = z.object({
  thankYouSent: z.boolean(),
});

type RouteContext = {
  params: Promise<{ id: string; claimId: string }>;
};

/**
 * DELETE /api/events/[id]/registry/claims/[claimId]
 * Guest unclaims an item. The invite token proves ownership: we only delete
 * if the claim's inviteId matches the token's invite. Organizer-sourced
 * claims (inviteId=null) can't be removed via this endpoint — that's the
 * organizer `purchased` toggle's job.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId, claimId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { inviteToken } = deleteClaimSchema.parse(body);

    const tokenHash = hashToken(inviteToken);
    const invite = await db.invite.findUnique({
      where: { tokenHash },
      select: { id: true, eventId: true, status: true },
    });
    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found for this event");
    }
    if (invite.status === "REVOKED") {
      throw new ValidationError("This invitation is no longer valid");
    }

    const claim = await db.registryClaim.findUnique({
      where: { id: claimId },
      select: { id: true, eventId: true, inviteId: true, source: true },
    });
    if (!claim || claim.eventId !== eventId) {
      throw new NotFoundError("Claim not found");
    }
    if (claim.source !== "GUEST" || claim.inviteId !== invite.id) {
      throw new ValidationError("You can only remove your own claim");
    }

    await db.registryClaim.delete({ where: { id: claimId } });

    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/events/[id]/registry/claims/[claimId]
 * Organizer flips the thank-you-sent flag. No body shape beyond
 * `{ thankYouSent: boolean }` — true stamps now, false clears. Kept
 * separate from DELETE so the organizer never needs the guest's token.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: eventId, claimId } = await context.params;
    const owns = await verifyEventOwnership(eventId, user.id);
    if (!owns) return errorResponse("Event not found or access denied", 404);

    const body = await request.json();
    const { thankYouSent } = patchClaimSchema.parse(body);

    const claim = await db.registryClaim.findUnique({
      where: { id: claimId },
      select: { id: true, eventId: true },
    });
    if (!claim || claim.eventId !== eventId) {
      throw new NotFoundError("Claim not found");
    }

    const updated = await db.registryClaim.update({
      where: { id: claimId },
      data: { thankYouSentAt: thankYouSent ? new Date() : null },
      select: { id: true, thankYouSentAt: true },
    });

    return successResponse({ claim: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
