import { createHash, randomBytes } from "node:crypto";

/**
 * Google Drive OAuth 2.0 helpers.
 *
 * Scope: `drive.readonly` — a Google "restricted scope" that requires a
 * CASA security assessment + OAuth consent screen verification before the
 * app can request it from external users. While the OAuth app is in
 * "Testing" mode (allowlisted operator emails only), this works without
 * verification. Production launch is gated on completing Google's review.
 *
 * Why not `drive.file` (non-sensitive)? The Picker iframe needs read
 * access to fetch thumbnails for files the user has NOT yet selected —
 * `drive.file` only grants per-file access AFTER the Picker emits a
 * PICKED action, which is too late. With third-party-cookie restrictions
 * in modern browsers blocking the Picker's session-based thumbnail auth,
 * `drive.readonly` is the only practical way to get previews to render.
 *
 * Migration note: when this constant changes, existing connected users'
 * refresh tokens still carry the old scope (Google does not widen scope
 * on refresh). They must reconnect via the dashboard to pick up the new
 * scope set. Pre-GA: only the operator is affected.
 *
 * See:
 *   - https://developers.google.com/identity/protocols/oauth2/web-server
 *   - https://developers.google.com/drive/api/guides/api-specific-auth
 *   - https://support.google.com/cloud/answer/13463073 (restricted-scope review)
 */

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

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

/**
 * Typed error from Google's token endpoint. Carries the parsed `error`
 * code so callers can branch on permanent vs transient failures —
 * specifically, `invalid_grant` on refresh means the user revoked the
 * app at Google's end and the local row needs to be marked revoked.
 */
export class GoogleTokenError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string | null,
    public readonly errorDescription: string | null,
  ) {
    super(
      `Google token endpoint ${status}: ${errorDescription || errorCode || "unknown"}`,
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
    throw new GoogleTokenError(
      res.status,
      data?.error ?? null,
      data?.error_description ?? null,
    );
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

const DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";

export type GoogleDriveDownloadErrorCode =
  | "SOURCE_FILE_NOT_FOUND"
  | "SOURCE_PERMISSION_DENIED"
  | "SOURCE_DOWNLOAD_FAILED"
  | "FILE_TOO_LARGE";

/**
 * Typed download error so the worker can classify failures into the
 * error_code vocabulary from plan §15 (SOURCE_FILE_NOT_FOUND,
 * SOURCE_PERMISSION_DENIED, SOURCE_DOWNLOAD_FAILED, FILE_TOO_LARGE).
 */
export class GoogleDriveDownloadError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: GoogleDriveDownloadErrorCode,
    detail?: string,
  ) {
    super(
      `Google Drive download ${status}: ${detail ?? errorCode}`,
    );
  }
}

/** Half the Vercel function maxDuration. Leaves budget for processing
 *  after the download lands. */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Downloads a file's binary content from Drive. Returns the buffer plus
 * the server-reported MIME type — we re-validate the MIME against the
 * buffer's magic bytes in the worker, since the Picker's mimeType is
 * client-reported metadata and not authoritative.
 *
 * The drive.file scope grants access only to files the user explicitly
 * picked via the Picker, so a 403 here typically means the user revoked
 * the app's access at their Google Account (handled upstream by
 * getValidAccessToken's invalid_grant detection) — but if a single file
 * gets shared/unshared between selection and import, we still hit 403.
 *
 * `maxBytes` is checked against the Content-Length response header
 * BEFORE the body is read into memory. This guards the function against
 * OOM if Drive metadata claimed a small size but the actual file is
 * huge. Defense-in-depth — the worker also re-checks buffer length
 * after the download lands.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}?alt=media`;
  const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // AbortError lands here when the timeout fires; treat as transient
    // SOURCE_DOWNLOAD_FAILED so the worker auto-retries.
    throw new GoogleDriveDownloadError(
      0,
      "SOURCE_DOWNLOAD_FAILED",
      err instanceof Error ? err.message : "fetch failed",
    );
  }
  if (!res.ok) {
    if (res.status === 404) {
      throw new GoogleDriveDownloadError(404, "SOURCE_FILE_NOT_FOUND");
    }
    if (res.status === 401 || res.status === 403) {
      throw new GoogleDriveDownloadError(res.status, "SOURCE_PERMISSION_DENIED");
    }
    throw new GoogleDriveDownloadError(res.status, "SOURCE_DOWNLOAD_FAILED");
  }
  if (options.maxBytes !== undefined) {
    const declared = res.headers.get("content-length");
    if (declared) {
      const declaredSize = Number.parseInt(declared, 10);
      if (Number.isFinite(declaredSize) && declaredSize > options.maxBytes) {
        throw new GoogleDriveDownloadError(
          res.status,
          "FILE_TOO_LARGE",
          `Declared size ${declaredSize} bytes exceeds limit ${options.maxBytes}`,
        );
      }
    }
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  return { buffer, mimeType };
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
