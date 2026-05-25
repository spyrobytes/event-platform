import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";

/**
 * GET /api/auth/google-drive/status
 *
 * Returns `{ connected: boolean, scope?: string, expiresAt?: string }`
 * for the authenticated user. The dashboard uses this to decide whether
 * to render "Connect Google Drive" vs "Connected / Disconnect / Select
 * Photos". Doesn't decrypt anything — `revokedAt` is the authority.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const token = await db.providerToken.findUnique({
      where: { userId_provider: { userId: user.id, provider: "GOOGLE_DRIVE" } },
      select: { revokedAt: true, scope: true, expiresAt: true },
    });

    if (!token || token.revokedAt) {
      return successResponse({ connected: false });
    }

    return successResponse({
      connected: true,
      scope: token.scope,
      expiresAt: token.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
