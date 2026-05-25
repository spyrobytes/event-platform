import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { refreshGoogleDriveAccessToken } from "@/lib/providers/google-drive";
import type { GallerySourceType } from "@prisma/client";

/**
 * Encrypted OAuth token storage helpers.
 *
 * Envelope layout: iv (12 bytes) || authTag (16 bytes) || ciphertext.
 * AES-256-GCM with a 32-byte key from PROVIDER_TOKEN_ENCRYPTION_KEY
 * (base64-encoded). One row per (user, provider) in the provider_tokens
 * table — see prisma/schema.prisma.
 *
 * Threat model: at-rest protection for refresh tokens in the database.
 * An attacker who compromises the DB without the encryption key cannot
 * mint new access tokens; an attacker with both can. Key rotation
 * invalidates every stored token (forcing organizers to reconnect).
 */

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
/** Refresh access tokens this many ms before their stated expiry, so a
 * worker that takes a few seconds doesn't burn a refresh on the next call. */
const REFRESH_SKEW_MS = 60_000;

function getEncryptionKey(): Buffer {
  const raw = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PROVIDER_TOKEN_ENCRYPTION_KEY is not set. Generate with `openssl rand -base64 32`.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `PROVIDER_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Generate with \`openssl rand -base64 32\`.`,
    );
  }
  return key;
}

/**
 * Encrypts a UTF-8 plaintext token into an envelope suitable for storage
 * in a `Bytes` Prisma column. Generates a fresh IV per call — never re-use
 * IVs with the same key.
 *
 * Returns Uint8Array (not Buffer) so the type matches what Prisma's Bytes
 * column accepts. Node's Buffer is runtime-compatible but TypeScript
 * widens its generic in a way Prisma doesn't accept on writes.
 */
export function encryptToken(plaintext: string): Uint8Array<ArrayBuffer> {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Allocate over a fresh ArrayBuffer (not wrapping Buffer's pool) so the
  // return type is Uint8Array<ArrayBuffer> — what Prisma's Bytes column
  // accepts on writes. `new Uint8Array(N)` always backs onto ArrayBuffer.
  const out = new Uint8Array(iv.length + authTag.length + ciphertext.length);
  out.set(iv, 0);
  out.set(authTag, iv.length);
  out.set(ciphertext, iv.length + authTag.length);
  return out;
}

/**
 * Inverse of encryptToken. Throws if the envelope is too short, the
 * authentication tag doesn't verify, or the encryption key is missing /
 * wrong shape. Callers should treat any throw as "token is unusable —
 * force the user to reconnect."
 */
export function decryptToken(envelope: Uint8Array): string {
  if (envelope.length < IV_BYTES + AUTH_TAG_BYTES + 1) {
    throw new Error("Provider token envelope is truncated");
  }
  const key = getEncryptionKey();
  const iv = envelope.subarray(0, IV_BYTES);
  const authTag = envelope.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = envelope.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
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
    const refreshed = await refreshGoogleDriveAccessToken(refreshToken);
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
