import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { successResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

/**
 * POST /api/invites/unsubscribe?token=xxx
 * Unsubscribe an invite from future emails about this event.
 * Public endpoint — authenticated by the invite token itself.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      throw new NotFoundError("Invalid unsubscribe link");
    }

    const tokenHash = hashToken(token);

    const invite = await db.invite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        unsubscribedAt: true,
        event: { select: { title: true } },
      },
    });

    if (!invite) {
      throw new NotFoundError("Invalid unsubscribe link");
    }

    // Already unsubscribed — idempotent success
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
