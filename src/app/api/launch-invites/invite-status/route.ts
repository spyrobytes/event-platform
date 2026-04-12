import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/launch-invites/invite-status
 * Authenticated — checks whether the current user has a claimed invite.
 * Used by AuthGuard to gate dashboard access during invitational phase.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    // Admins bypass invite check
    if (user.isAdmin) {
      return successResponse({ hasInvite: true, isAdmin: true });
    }

    const claimedInvite = await db.launchInvite.findFirst({
      where: { claimedById: user.id, status: "CLAIMED" },
      select: { id: true, code: true, claimedAt: true },
    });

    return successResponse({
      hasInvite: !!claimedInvite,
      isAdmin: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
