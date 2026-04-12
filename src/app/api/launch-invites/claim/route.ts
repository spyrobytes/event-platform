import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { normalizeInviteCode } from "@/lib/invite-codes";

/**
 * POST /api/launch-invites/claim
 * Authenticated — claims an invite code for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const rawCode = body.code;

    if (!rawCode || typeof rawCode !== "string") {
      return errorResponse("Invite code is required", 400);
    }

    const code = normalizeInviteCode(rawCode);

    const invite = await db.launchInvite.findUnique({
      where: { code },
    });

    if (!invite) {
      return errorResponse("Invalid invite code", 404, "INVALID_CODE");
    }

    if (invite.status === "REVOKED") {
      return errorResponse("This invite has been revoked", 410, "REVOKED");
    }

    if (invite.status === "CLAIMED" && invite.usesRemaining <= 0) {
      return errorResponse("This invite has already been used", 410, "ALREADY_CLAIMED");
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return errorResponse("This invite has expired", 410, "EXPIRED");
    }

    // Check if this user already claimed any invite
    const existingClaim = await db.launchInvite.findFirst({
      where: { claimedById: user.id, status: "CLAIMED" },
    });

    if (existingClaim) {
      return successResponse({ claimed: true, alreadyHadInvite: true });
    }

    // Claim the invite
    await db.launchInvite.update({
      where: { id: invite.id },
      data: {
        status: "CLAIMED",
        claimedById: user.id,
        claimedAt: new Date(),
        usesRemaining: invite.usesRemaining - 1,
      },
    });

    return successResponse({ claimed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
