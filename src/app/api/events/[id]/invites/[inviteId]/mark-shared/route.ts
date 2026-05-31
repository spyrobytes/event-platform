import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string; inviteId: string }>;
};

/**
 * POST /api/events/[id]/invites/[inviteId]/mark-shared
 * Records that the organizer manually shared a phone-only invite's link
 * (WhatsApp / SMS / Copy). Phone-only invites have no email pipeline to flip
 * them to SENT, so without this they'd sit at PENDING forever and the funnel
 * would under-count guests who were actually contacted.
 *
 * Idempotent: only advances PENDING -> SENT (+ sentAt). For any later state
 * (OPENED / RESPONDED / SENT / BOUNCED / EXPIRED / REVOKED) it's a no-op so a
 * re-tap can't regress the funnel — we never want this to downgrade progress.
 * Owner-only.
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
      select: { id: true, eventId: true, status: true, sentAt: true },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found");
    }

    // No-op for anything past PENDING — keep the funnel monotonic.
    if (invite.status !== "PENDING") {
      return successResponse({
        id: invite.id,
        status: invite.status,
        sentAt: invite.sentAt,
        changed: false,
      });
    }

    const updated = await db.invite.update({
      where: { id: inviteId },
      data: { status: "SENT", sentAt: new Date() },
      select: { id: true, status: true, sentAt: true },
    });

    return successResponse({ ...updated, changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
