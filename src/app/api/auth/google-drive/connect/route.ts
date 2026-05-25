import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import {
  buildAuthorizeUrl,
  generatePkcePair,
  GoogleOAuthNotConfiguredError,
} from "@/lib/providers/google-drive";
import {
  generateStateNonce,
  signOAuthState,
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
} from "@/lib/oauth-state";

/**
 * POST /api/auth/google-drive/connect
 *
 * Starts the Google Drive OAuth dance for the authenticated user. Returns
 * `{ authorizeUrl }`; the client navigates the browser there. State +
 * PKCE verifier are stored in a signed httpOnly cookie scoped to
 * /api/auth/google-drive — picked up by the callback route.
 *
 * Returns 503 (not 500) when Google OAuth isn't configured, so the
 * dashboard can surface "ask the operator to set up Drive credentials"
 * rather than a generic error.
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

    const state = generateStateNonce();
    const { verifier, challenge } = generatePkcePair();

    let authorizeUrl: string;
    try {
      authorizeUrl = buildAuthorizeUrl({ state, codeChallenge: challenge });
    } catch (err) {
      if (err instanceof GoogleOAuthNotConfiguredError) {
        return errorResponse(err.message, 503, err.code);
      }
      throw err;
    }

    const cookieValue = signOAuthState({ userId: user.id, state, verifier });
    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: STATE_COOKIE_PATH,
      maxAge: 10 * 60,
    });

    return successResponse({ authorizeUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
