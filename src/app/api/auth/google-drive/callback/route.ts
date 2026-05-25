import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { encryptToken } from "@/lib/provider-tokens";
import {
  exchangeAuthorizationCode,
  GoogleOAuthNotConfiguredError,
} from "@/lib/providers/google-drive";
import {
  InvalidOAuthStateError,
  sanitizeNextUrl,
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  verifyOAuthState,
} from "@/lib/oauth-state";

/**
 * GET /api/auth/google-drive/callback
 *
 * Google redirects here with ?code=&state=. Verifies the signed state
 * cookie set by /connect, exchanges the code for tokens, encrypts and
 * upserts the row in `provider_tokens`, then redirects the browser back
 * to the dashboard gallery page with a status query.
 *
 * Browser-facing: failures redirect with `?gdrive=error&reason=...` so
 * the dashboard can render a clear message. Returning JSON here would
 * land the user on a raw API page.
 */
export async function GET(request: NextRequest) {
  const DASHBOARD_FALLBACK = "/dashboard";

  // Carries through both happy and error paths: the connect route may have
  // stashed a `next` in the state cookie that we'll honor below. On any
  // failure that happens BEFORE we decode the cookie, fall back to the
  // bare dashboard.
  let returnTo = DASHBOARD_FALLBACK;

  const fail = (reason: string) => {
    const url = new URL(request.url);
    const back = new URL(returnTo, url.origin);
    back.searchParams.set("gdrive", "error");
    back.searchParams.set("reason", reason);
    return NextResponse.redirect(back, { status: 303 });
  };

  if (!isPostEventGalleryEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // User clicked "Cancel" on the Google consent screen, or Google
  // refused the request. Strip the cookie and bounce back cleanly.
  if (oauthError) {
    const cookieStore = await cookies();
    cookieStore.delete({ name: STATE_COOKIE_NAME, path: STATE_COOKIE_PATH });
    return fail(oauthError);
  }

  if (!code || !stateParam) return fail("missing_params");

  const cookieStore = await cookies();
  const cookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  // Always clear the cookie before continuing — single-use semantics.
  cookieStore.delete({ name: STATE_COOKIE_NAME, path: STATE_COOKIE_PATH });
  if (!cookie) return fail("missing_state_cookie");

  let payload;
  try {
    payload = verifyOAuthState(cookie);
  } catch (err) {
    return fail(err instanceof InvalidOAuthStateError ? "invalid_state" : "state_verification_failed");
  }

  // Re-sanitize on the read side: the connect route already filtered, but
  // re-checking here means we still refuse open redirects if anyone ever
  // bypasses the connect helper and signs a cookie directly.
  returnTo = sanitizeNextUrl(payload.next) ?? DASHBOARD_FALLBACK;

  if (payload.state !== stateParam) return fail("state_mismatch");

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: payload.verifier,
    });
    if (!tokens.refreshToken) {
      // The connect URL forces prompt=consent specifically so we always
      // receive a refresh token on first consent — landing here means the
      // Google project / consent screen is misconfigured.
      return fail("no_refresh_token");
    }

    const expiresAt = new Date(Date.now() + tokens.expiresInSec * 1000);
    const accessEnv = encryptToken(tokens.accessToken);
    const refreshEnv = encryptToken(tokens.refreshToken);

    await db.providerToken.upsert({
      where: {
        userId_provider: {
          userId: payload.userId,
          provider: "GOOGLE_DRIVE",
        },
      },
      create: {
        userId: payload.userId,
        provider: "GOOGLE_DRIVE",
        accessTokenEnvelope: accessEnv,
        refreshTokenEnvelope: refreshEnv,
        scope: tokens.scope,
        expiresAt,
      },
      update: {
        accessTokenEnvelope: accessEnv,
        refreshTokenEnvelope: refreshEnv,
        scope: tokens.scope,
        expiresAt,
        revokedAt: null,
      },
    });

    const back = new URL(returnTo, url.origin);
    back.searchParams.set("gdrive", "connected");
    return NextResponse.redirect(back, { status: 303 });
  } catch (err) {
    if (err instanceof GoogleOAuthNotConfiguredError) {
      return fail("not_configured");
    }
    console.error("[gdrive callback] token exchange failed", err);
    return fail("token_exchange_failed");
  }
}
