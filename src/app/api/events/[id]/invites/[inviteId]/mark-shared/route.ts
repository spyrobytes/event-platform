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
 * Records that the organizer composed/shared a phone-only invite's link
 * (WhatsApp / SMS / Copy). The deep links hand off to the OS with no send or
 * delivery callback, so the honest state is DRAFTED — "a draft was composed,"
 * NOT SENT (which on the email channel means an actual dispatch). DRAFTED is
 * the phone-channel peer of SENT and carries to OPENED once the guest clicks
 * the tokenized link (see /api/invites/lookup + the /invite/[token] pages).
 *
 * Idempotent: only advances PENDING -> DRAFTED. For any later state it's a
 * no-op so a re-tap can't regress the funnel. Owner-only.
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

    // No-op for anything past PENDING — keep the funnel monotonic.
    if (invite.status !== "PENDING") {
      return successResponse({
        id: invite.id,
        status: invite.status,
        changed: false,
      });
    }

    // Status only — deliberately NOT sentAt: nothing was actually sent, and a
    // false "sent at" timestamp is exactly the dishonesty DRAFTED fixes.
    const updated = await db.invite.update({
      where: { id: inviteId },
      data: { status: "DRAFTED" },
      select: { id: true, status: true },
    });

    return successResponse({ ...updated, changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
