import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { generateTokenPair } from "@/lib/tokens";
import { encryptInviteToken } from "@/lib/invite-token-crypto";
import { NotFoundError, ValidationError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string; inviteId: string }>;
};

/**
 * POST /api/events/[id]/invites/[inviteId]/regenerate
 * Regenerate an invite's token (owner only).
 * Invalidates the previous link and returns a new raw token.
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
      select: { id: true, eventId: true, status: true, tokenRegenerateCount: true },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found");
    }

    if (invite.status === "REVOKED") {
      throw new ValidationError("Cannot regenerate a revoked invite");
    }

    if (invite.status === "EXPIRED") {
      throw new ValidationError("Cannot regenerate an expired invite");
    }

    if (invite.tokenRegenerateCount >= MAX_REGENERATIONS) {
      throw new ValidationError(
        `Regeneration limit reached (${MAX_REGENERATIONS}). Revoke this invite and create a new one instead.`
      );
    }

    const { token, hash } = generateTokenPair();

    const updated = await db.invite.update({
      where: { id: inviteId },
      data: {
        tokenHash: hash,
        tokenEnc: encryptInviteToken(token),
        tokenRegenerateCount: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        status: true,
        tokenRegenerateCount: true,
      },
    });

    return successResponse({
      ...updated,
      token,
      regenerationsRemaining: MAX_REGENERATIONS - updated.tokenRegenerateCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
