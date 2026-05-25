import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyInviteUnsubscribe } from "@/lib/invite-unsubscribe-signature";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";

const bodySchema = z.object({
  inviteId: z.string().min(1),
  eventId: z.string().min(1),
  sig: z.string().min(1),
});

/**
 * POST /api/invites/unsubscribe-by-id
 *
 * Public endpoint authenticated by an HMAC signature over
 * `${inviteId}.${eventId}` (see src/lib/invite-unsubscribe-signature.ts).
 * Used by GALLERY_PUBLISHED broadcast emails — the raw invite token isn't
 * available at enqueue time so the regular `/unsubscribe/[token]` flow
 * doesn't apply here.
 *
 * Sig mismatch and unknown invite both return 404 with the same generic
 * message to avoid leaking which IDs exist.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteId, eventId, sig } = bodySchema.parse(body);

    if (!verifyInviteUnsubscribe(inviteId, eventId, sig)) {
      return errorResponse("Invalid unsubscribe link", 404, "INVALID_LINK");
    }

    // findFirst (not findUnique) so the eventId filter participates in the
    // lookup. A valid sig for inviteId X is only honored against the event
    // it was minted for.
    const invite = await db.invite.findFirst({
      where: { id: inviteId, eventId },
      select: {
        id: true,
        unsubscribedAt: true,
        event: { select: { title: true } },
      },
    });

    if (!invite) {
      return errorResponse("Invalid unsubscribe link", 404, "INVALID_LINK");
    }

    if (invite.unsubscribedAt) {
      return successResponse({
        message: `You have already unsubscribed from emails about "${invite.event.title}".`,
      });
    }

    await db.invite.update({
      where: { id: invite.id },
      data: { unsubscribedAt: new Date() },
    });

    return successResponse({
      message: `You have been unsubscribed from future emails about "${invite.event.title}".`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
