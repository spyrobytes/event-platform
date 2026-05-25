import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import {
  getValidAccessToken,
  ProviderTokenNotFoundError,
  ProviderTokenRevokedError,
} from "@/lib/provider-tokens";

/**
 * POST /api/auth/google-drive/access-token
 *
 * Returns a short-lived Drive access token for the Picker JS API to use.
 * The Picker calls Google APIs directly from the browser, so we have to
 * surface a token to it — but we mint it server-side from the encrypted
 * refresh token (the long-lived secret never leaves the server).
 *
 * POST (not GET) because this is a state-mutating call from the worker's
 * point of view: getValidAccessToken may refresh and write a new envelope
 * to provider_tokens. POST also means it won't be cached anywhere.
 *
 * Returns 409 when the user needs to reconnect (no token / revoked /
 * `invalid_grant` from Google) so the dashboard can swap to the Connect
 * button without retry loops.
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

    try {
      const accessToken = await getValidAccessToken(user.id, "GOOGLE_DRIVE");
      return successResponse({ accessToken });
    } catch (err) {
      if (
        err instanceof ProviderTokenNotFoundError ||
        err instanceof ProviderTokenRevokedError
      ) {
        return errorResponse(
          "Reconnect required",
          409,
          err.code,
        );
      }
      throw err;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
