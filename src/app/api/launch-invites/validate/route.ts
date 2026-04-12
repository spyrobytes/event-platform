import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { normalizeInviteCode } from "@/lib/invite-codes";

/**
 * POST /api/launch-invites/validate
 * Public — checks whether an invite code is valid and available.
 * Does NOT claim the code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawCode = body.code;

    if (!rawCode || typeof rawCode !== "string") {
      return errorResponse("Invite code is required", 400);
    }

    const code = normalizeInviteCode(rawCode);

    const invite = await db.launchInvite.findUnique({
      where: { code },
      select: {
        id: true,
        status: true,
        usesRemaining: true,
        expiresAt: true,
        email: true,
      },
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

    if (invite.status === "EXPIRED" || (invite.expiresAt && invite.expiresAt < new Date())) {
      return errorResponse("This invite has expired", 410, "EXPIRED");
    }

    return successResponse({ valid: true, code });
  } catch (error) {
    return handleApiError(error);
  }
}
