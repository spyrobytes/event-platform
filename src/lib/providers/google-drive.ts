import { createHash, randomBytes } from "node:crypto";

/**
 * Google Drive OAuth 2.0 helpers.
 *
 * Scope mandate: `drive.file` (non-sensitive). The Google Picker selects
 * specific files client-side; the backend can then download only those
 * files via the Drive API. `drive.readonly` and `drive` require Google's
 * Restricted Scope security assessment — explicitly NOT used here.
 *
 * See:
 *   - https://developers.google.com/identity/protocols/oauth2/web-server
 *   - https://developers.google.com/drive/api/guides/api-specific-auth
 */

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export class GoogleOAuthNotConfiguredError extends Error {
  readonly code = "GOOGLE_OAUTH_NOT_CONFIGURED";
  constructor() {
    super(
      "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
    );
  }
}

function getClientId(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!v) throw new GoogleOAuthNotConfiguredError();
  return v;
}

function getClientSecret(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!v) throw new GoogleOAuthNotConfiguredError();
  return v;
}

/**
 * The redirect URI configured in Google Cloud Console must match this
 * exactly, including protocol and trailing path. Derived from
 * NEXT_PUBLIC_BASE_URL so preview / production / local each use their
 * own callback — register all needed URIs in Google Console.
 */
export function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL must be set to build the OAuth redirect URI");
  }
  return `${baseUrl.replace(/\/+$/, "")}/api/auth/google-drive/callback`;
}

/**
 * Generates a PKCE pair. Verifier is a 43-char URL-safe base64 string;
 * challenge is base64url(SHA-256(verifier)) — required by Google when
 * code_challenge_method=S256.
 */
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

type AuthorizeUrlInput = {
  state: string;
  codeChallenge: string;
};

/**
 * Builds the Google consent URL. `access_type=offline` + `prompt=consent`
 * forces a refresh token on every consent (Google omits the refresh token
 * on re-consent otherwise, which would silently break reconnect flows).
 */
export function buildAuthorizeUrl({ state, codeChallenge }: AuthorizeUrlInput): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
  scope: string;
};

type RawTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function postToTokenEndpoint(body: URLSearchParams): Promise<RawTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => null)) as RawTokenResponse | null;
  if (!res.ok || !data) {
    const detail = data?.error_description || data?.error || res.statusText;
    throw new Error(`Google token endpoint ${res.status}: ${detail}`);
  }
  return data;
}

/**
 * Exchanges the authorization code (from the callback) for tokens.
 * Requires the same PKCE verifier that was used to build the consent URL.
 */
export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
  });
  const data = await postToTokenEndpoint(body);
  if (!data.access_token || !data.expires_in) {
    throw new Error("Google token response missing access_token or expires_in");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSec: data.expires_in,
    scope: data.scope ?? GOOGLE_DRIVE_SCOPE,
  };
}

/**
 * Mints a fresh access token from a stored refresh token. Google does
 * NOT rotate refresh tokens by default — `refreshToken` on the response
 * is null in the common case and the caller should keep the existing one.
 */
export async function refreshGoogleDriveAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const data = await postToTokenEndpoint(body);
  if (!data.access_token || !data.expires_in) {
    throw new Error("Google refresh response missing access_token or expires_in");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSec: data.expires_in,
    scope: data.scope ?? GOOGLE_DRIVE_SCOPE,
  };
}

/**
 * Revokes a token with Google. Accepts either an access or refresh token
 * (Google treats both as revocable). Best-effort: caller should still mark
 * the local row revoked even if this throws, since the local token is
 * the source of authority for "should we still try to use this."
 */
export async function revokeGoogleDriveToken(token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  const res = await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok && res.status !== 400) {
    // Google returns 400 for "already revoked / invalid" — that's fine for us.
    throw new Error(`Google revoke endpoint ${res.status}`);
  }
}
