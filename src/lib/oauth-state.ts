import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed-cookie state for the OAuth redirect dance.
 *
 * Payload layout (base64url JSON): { userId, state, verifier, exp }.
 * Cookie value: `<base64url(JSON)>.<base64url(HMAC-SHA-256(payload))>`.
 *
 * Why a cookie instead of a DB row: the redirect flow is short-lived
 * (~10 min) and self-contained — no need for a sweep job to clean up
 * abandoned state. HMAC stops any tampering; the cookie is httpOnly so
 * the browser can't read the verifier or echo it back to JS.
 *
 * Scoped to /api/auth/google-drive so it doesn't ride along on every
 * request to the app.
 */

const TTL_MS = 10 * 60 * 1000;
export const STATE_COOKIE_NAME = "gdrive_oauth_state";
export const STATE_COOKIE_PATH = "/api/auth/google-drive";

export type OAuthStatePayload = {
  userId: string;
  state: string;
  verifier: string;
  exp: number;
};

function getSigningKey(): Buffer {
  const raw = process.env.OAUTH_STATE_SIGNING_KEY;
  if (!raw) {
    throw new Error(
      "OAUTH_STATE_SIGNING_KEY is not set. Generate with `openssl rand -base64 32`.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length < 32) {
    throw new Error(
      `OAUTH_STATE_SIGNING_KEY must decode to ≥32 bytes (got ${key.length}).`,
    );
  }
  return key;
}

/** Random URL-safe nonce used for the OAuth `state` query parameter. */
export function generateStateNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function signOAuthState(
  payload: Omit<OAuthStatePayload, "exp"> & { exp?: number },
): string {
  const full: OAuthStatePayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + TTL_MS,
  };
  const json = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSigningKey()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export class InvalidOAuthStateError extends Error {
  readonly code = "INVALID_OAUTH_STATE";
}

export function verifyOAuthState(cookieValue: string): OAuthStatePayload {
  const dot = cookieValue.indexOf(".");
  if (dot < 0) throw new InvalidOAuthStateError("Malformed state cookie");
  const json = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = createHmac("sha256", getSigningKey()).update(json).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new InvalidOAuthStateError("State signature mismatch");
  }
  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
  } catch {
    throw new InvalidOAuthStateError("State payload not parseable");
  }
  if (
    typeof payload.userId !== "string" ||
    typeof payload.state !== "string" ||
    typeof payload.verifier !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new InvalidOAuthStateError("State payload shape invalid");
  }
  if (payload.exp < Date.now()) {
    throw new InvalidOAuthStateError("State expired");
  }
  return payload;
}
