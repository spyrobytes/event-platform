import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { decryptToken } from "@/lib/provider-tokens";
import { revokeGoogleDriveToken } from "@/lib/providers/google-drive";

/**
 * POST /api/auth/google-drive/disconnect
 *
 * Revokes the user's Google Drive tokens with Google and marks the local
 * row revoked. Does NOT delete already-imported gallery items — those stay
 * because they're hosted in Supabase Storage now, not in Drive. See
 * decision §13 of the consolidated plan.
 *
 * Best-effort revoke: if Google rejects the call, we still mark the local
 * row revoked. The worst case is that Google still has a valid token
 * floating around that we can't use; the user can revoke it manually from
 * their Google Account if they care.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }
    assertCanMutate(user);

    const token = await db.providerToken.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: "GOOGLE_DRIVE" },
      },
      select: {
        id: true,
        refreshTokenEnvelope: true,
        accessTokenEnvelope: true,
        revokedAt: true,
      },
    });

    if (!token) {
      return successResponse({ disconnected: true, alreadyAbsent: true });
    }

    if (!token.revokedAt) {
      // Prefer revoking the refresh token (broader scope of invalidation).
      const envelope = token.refreshTokenEnvelope ?? token.accessTokenEnvelope;
      try {
        const plain = decryptToken(envelope);
        await revokeGoogleDriveToken(plain);
      } catch (err) {
        // Don't fail the whole disconnect — log and continue to mark local
        // row revoked. See file-level comment for rationale.
        console.error("[gdrive disconnect] remote revoke failed", err);
      }
    }

    await db.providerToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });

    return successResponse({ disconnected: true });
  } catch (error) {
    return handleApiError(error);
  }
}
