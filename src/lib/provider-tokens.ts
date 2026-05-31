import { db } from "@/lib/db";
import {
  GoogleTokenError,
  refreshGoogleDriveAccessToken,
} from "@/lib/providers/google-drive";
import {
  aesGcmEncrypt,
  aesGcmDecrypt,
  loadAes256Key,
} from "@/lib/crypto-envelope";
import type { GallerySourceType } from "@prisma/client";

/**
 * Encrypted OAuth token storage helpers.
 *
 * AES-256-GCM via the shared envelope helper (src/lib/crypto-envelope.ts),
 * keyed by PROVIDER_TOKEN_ENCRYPTION_KEY (base64, 32 bytes). One row per
 * (user, provider) in the provider_tokens table — see prisma/schema.prisma.
 *
 * Threat model: at-rest protection for refresh tokens in the database.
 * An attacker who compromises the DB without the encryption key cannot
 * mint new access tokens; an attacker with both can. Key rotation
 * invalidates every stored token (forcing organizers to reconnect).
 */

/** Refresh access tokens this many ms before their stated expiry, so a
 * worker that takes a few seconds doesn't burn a refresh on the next call. */
const REFRESH_SKEW_MS = 60_000;

/**
 * Encrypts a UTF-8 plaintext token for storage in the `Bytes` envelope column.
 * Throws if PROVIDER_TOKEN_ENCRYPTION_KEY is missing / the wrong length.
 */
export function encryptToken(plaintext: string): Uint8Array<ArrayBuffer> {
  return aesGcmEncrypt(plaintext, loadAes256Key("PROVIDER_TOKEN_ENCRYPTION_KEY"));
}

/**
 * Inverse of encryptToken. Throws if the envelope is too short, the
 * authentication tag doesn't verify, or the encryption key is missing /
 * wrong shape. Callers should treat any throw as "token is unusable —
 * force the user to reconnect."
 */
export function decryptToken(envelope: Uint8Array): string {
  return aesGcmDecrypt(envelope, loadAes256Key("PROVIDER_TOKEN_ENCRYPTION_KEY"));
}

export class ProviderTokenNotFoundError extends Error {
  readonly code = "PROVIDER_TOKEN_NOT_FOUND";
  constructor(provider: GallerySourceType) {
    super(`No active token for provider ${provider}. User must reconnect.`);
  }
}

export class ProviderTokenRevokedError extends Error {
  readonly code = "PROVIDER_TOKEN_REVOKED";
  constructor(provider: GallerySourceType) {
    super(`Token for provider ${provider} has been revoked. User must reconnect.`);
  }
}

/**
 * Returns a valid (non-expired) access token for the given user/provider.
 * Refreshes via the provider's refresh endpoint when the stored access
 * token is within REFRESH_SKEW_MS of expiry; updates the row in-place.
 *
 * Throws ProviderTokenNotFoundError / ProviderTokenRevokedError so callers
 * (worker, picker access-token endpoint) can surface the "reconnect needed"
 * state distinctly from transient errors.
 */
export async function getValidAccessToken(
  userId: string,
  provider: GallerySourceType,
): Promise<string> {
  const token = await db.providerToken.findUnique({
    where: { userId_provider: { userId, provider } },
    select: {
      id: true,
      accessTokenEnvelope: true,
      refreshTokenEnvelope: true,
      expiresAt: true,
      revokedAt: true,
      scope: true,
    },
  });

  if (!token) throw new ProviderTokenNotFoundError(provider);
  if (token.revokedAt) throw new ProviderTokenRevokedError(provider);

  const expiresAt = token.expiresAt?.getTime() ?? 0;
  const needsRefresh = !expiresAt || expiresAt - Date.now() < REFRESH_SKEW_MS;

  if (!needsRefresh) {
    return decryptToken(token.accessTokenEnvelope);
  }

  // Refresh path. Only Google Drive is wired in this PR; future providers
  // get their own arms in this switch.
  if (!token.refreshTokenEnvelope) {
    throw new ProviderTokenRevokedError(provider);
  }
  const refreshToken = decryptToken(token.refreshTokenEnvelope);

  if (provider === "GOOGLE_DRIVE") {
    let refreshed;
    try {
      refreshed = await refreshGoogleDriveAccessToken(refreshToken);
    } catch (err) {
      // `invalid_grant` means Google has invalidated this refresh token —
      // the user revoked the app at their Google Account, the token expired
      // after long inactivity, or it was issued under an old client. Mark
      // the local row revoked so the worker (PR #5) stops retrying forever
      // and the dashboard can surface "reconnect needed." Other Google
      // errors (5xx, transient network failures) re-throw so the caller
      // can retry later.
      if (err instanceof GoogleTokenError && err.errorCode === "invalid_grant") {
        await db.providerToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
        throw new ProviderTokenRevokedError(provider);
      }
      throw err;
    }
    await db.providerToken.update({
      where: { id: token.id },
      data: {
        accessTokenEnvelope: encryptToken(refreshed.accessToken),
        expiresAt: new Date(Date.now() + refreshed.expiresInSec * 1000),
        // Google occasionally rotates refresh tokens; persist the new one
        // when issued. Most refreshes don't include a new refresh_token,
        // in which case we keep the existing envelope.
        ...(refreshed.refreshToken
          ? { refreshTokenEnvelope: encryptToken(refreshed.refreshToken) }
          : {}),
      },
    });
    return refreshed.accessToken;
  }

  throw new Error(`Refresh not implemented for provider ${provider}`);
}
