import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { generateGuestRsvpCode, hashRsvpCode } from "@/lib/rsvp-code";
import { NotFoundError, ValidationError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string; inviteId: string }>;
};

/**
 * POST /api/events/[id]/invites/[inviteId]/rsvp-code/regenerate
 *
 * Owner-only. Issues a fresh public-portal RSVP code for the invite,
 * overwriting the previous hash. The previous code stops working immediately
 * (one hash per invite, unique). Returns the raw new code in the response —
 * this is the only time the organizer sees it; subsequent surfaces show the
 * masked preview.
 *
 * Capped at 3 regenerations per invite, mirroring the invite-link regenerate
 * counter (`Invite.tokenRegenerateCount`). Past the cap, organizers should
 * revoke the invite and create a new one.
 *
 * **Known limitation — stale-code-in-queued-email:** when an invite's INVITE
 * email row is still QUEUED (cron hasn't picked it up yet), regenerate does
 * not patch the row's payload. The guest may still receive the OLD code if
 * the cron sends before the regenerate. Practical impact is bounded — the
 * cron runs every 5 minutes and email creation → delivery is usually under
 * a minute, so regenerate is overwhelmingly used for *post-delivery* fixes.
 * If this becomes a real problem, update QUEUED outbox rows here:
 *   tx.emailOutbox.updateMany({ where: { inviteId, template: "INVITE",
 *     status: "QUEUED" }, data: { payload: { ...old, rsvpCode: newCode } } })
 *
 * In-flight RSVP sessions created with the OLD code remain valid: the submit
 * endpoint validates `RsvpSession.tokenHash`, not `Invite.rsvpCodeHash`, so
 * regenerating doesn't kick guests mid-RSVP.
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

    const MAX_REGENERATIONS = 3;

    const invite = await db.invite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        eventId: true,
        status: true,
        rsvpCodeRegenerateCount: true,
      },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found");
    }

    if (invite.status === "REVOKED") {
      throw new ValidationError("Cannot regenerate a code for a revoked invite");
    }

    if (invite.status === "EXPIRED") {
      throw new ValidationError("Cannot regenerate a code for an expired invite");
    }

    if (invite.rsvpCodeRegenerateCount >= MAX_REGENERATIONS) {
      throw new ValidationError(
        `RSVP code regeneration limit reached (${MAX_REGENERATIONS}). Revoke this invite and create a new one instead.`
      );
    }

    const rsvpCode = generateGuestRsvpCode();

    const updated = await db.invite.update({
      where: { id: inviteId },
      data: {
        rsvpCodeHash: hashRsvpCode(rsvpCode),
        rsvpCodeIssuedAt: new Date(),
        rsvpCodeUsedAt: null,
        rsvpCodeRegenerateCount: { increment: 1 },
      },
      select: {
        id: true,
        rsvpCodeRegenerateCount: true,
      },
    });

    return successResponse({
      id: updated.id,
      rsvpCode,
      regenerationsRemaining: MAX_REGENERATIONS - updated.rsvpCodeRegenerateCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
