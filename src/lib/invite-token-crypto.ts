import { aesGcmEncrypt, aesGcmDecrypt, loadAes256Key } from "@/lib/crypto-envelope";

/**
 * At-rest encryption for the raw invite token, enabling a *durable* share link
 * for phone-only invites. The DB still stores `tokenHash` for lookup (RSVP
 * submission resolves by hash — that security model is unchanged); `tokenEnc`
 * is an additional AES-256-GCM envelope of the same raw token so the owner-only
 * list API can re-display the working `/rsvp/<token>` link after a reload,
 * without the raw token ever living in plaintext at rest.
 *
 * A DB read *without* INVITE_TOKEN_ENC_KEY learns nothing usable — same posture
 * as today's hashed-only tokens. Rotating the key drops durability for all
 * existing invites (links revert to session-ephemeral); it does NOT break RSVP,
 * which never depends on this field.
 *
 * Graceful degradation: when the key is unset (or decryption fails), these
 * helpers return null rather than throwing. Durability is a nice-to-have, so a
 * missing/rotated key must never block invite creation or the dashboard.
 */

const ENV_VAR = "INVITE_TOKEN_ENC_KEY";

let warnedBadKey = false;
function warnBadKeyOnce(err: unknown): void {
  if (warnedBadKey) return;
  warnedBadKey = true;
  console.warn(
    `${ENV_VAR} is set but invalid — durable invite links disabled, falling back to session-ephemeral. ${
      err instanceof Error ? err.message : ""
    }`,
  );
}

/** True when the durable-link key is configured. */
export function inviteTokenEncryptionEnabled(): boolean {
  return !!process.env[ENV_VAR];
}

/**
 * Encrypts a raw invite token for storage in `Invite.tokenEnc`. Returns null
 * when no key is configured — the caller stores null and the invite simply
 * falls back to the session-ephemeral share behavior.
 *
 * Never throws: a *malformed* key (set but wrong length / not base64) also
 * degrades to null (+ a one-time warn) rather than failing invite creation —
 * durability is a nice-to-have, and a misconfigured key must not block the
 * core flow.
 */
export function encryptInviteToken(
  rawToken: string,
): Uint8Array<ArrayBuffer> | null {
  if (!process.env[ENV_VAR]) return null;
  try {
    return aesGcmEncrypt(rawToken, loadAes256Key(ENV_VAR));
  } catch (err) {
    warnBadKeyOnce(err);
    return null;
  }
}

/**
 * Decrypts a stored `tokenEnc` envelope back to the raw token, or null on any
 * failure (no key, tampering, truncation, key rotation). Callers treat null as
 * "no durable link available" and fall back to the ephemeral path.
 */
export function decryptInviteToken(
  envelope: Uint8Array | null | undefined,
): string | null {
  if (!envelope || !process.env[ENV_VAR]) return null;
  try {
    return aesGcmDecrypt(envelope, loadAes256Key(ENV_VAR));
  } catch {
    return null;
  }
}
