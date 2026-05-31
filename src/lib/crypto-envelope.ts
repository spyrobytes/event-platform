import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Generic AES-256-GCM "envelope" helpers, shared by every at-rest secret we
 * encrypt (OAuth provider tokens, durable invite-share tokens, …). Keeping the
 * envelope format in one place means the IV/tag layout and key validation can't
 * drift between call sites.
 *
 * Envelope layout: iv (12 bytes) || authTag (16 bytes) || ciphertext.
 *
 * Threat model: at-rest protection. An attacker who reads the ciphertext
 * without the key learns nothing and cannot forge a valid envelope (GCM auth
 * tag). An attacker with both key and ciphertext can decrypt. Rotating a key
 * invalidates everything encrypted under it.
 */

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Decodes a base64, 32-byte AES key from the named env var. Throws a helpful,
 * env-var-named error when it's missing or the wrong length so the message is
 * actionable wherever it surfaces.
 */
export function loadAes256Key(envVarName: string): Buffer {
  const raw = process.env[envVarName];
  if (!raw) {
    throw new Error(
      `${envVarName} is not set. Generate with \`openssl rand -base64 32\`.`,
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${envVarName} must decode to ${KEY_BYTES} bytes (got ${key.length}). Generate with \`openssl rand -base64 32\`.`,
    );
  }
  return key;
}

/**
 * Encrypts UTF-8 plaintext into a fresh envelope. A new IV is generated per
 * call — never reuse an IV with the same key.
 *
 * Returns Uint8Array<ArrayBuffer> (not Buffer) so the type matches what
 * Prisma's `Bytes` column accepts on writes.
 */
export function aesGcmEncrypt(
  plaintext: string,
  key: Buffer,
): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Back onto a fresh ArrayBuffer (not Buffer's shared pool) so the return type
  // is Uint8Array<ArrayBuffer> — what Prisma's Bytes column accepts on writes.
  const out = new Uint8Array(iv.length + authTag.length + ciphertext.length);
  out.set(iv, 0);
  out.set(authTag, iv.length);
  out.set(ciphertext, iv.length + authTag.length);
  return out;
}

/**
 * Inverse of {@link aesGcmEncrypt}. Throws if the envelope is truncated, the
 * auth tag doesn't verify, or the key is missing / wrong shape.
 */
export function aesGcmDecrypt(envelope: Uint8Array, key: Buffer): string {
  // iv + tag is the minimum valid envelope; the ciphertext may be empty
  // (GCM permits a zero-length plaintext). Using `+ 1` here would wrongly
  // reject a legitimately-encrypted empty string.
  if (envelope.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error("Encrypted envelope is truncated");
  }
  const iv = envelope.subarray(0, IV_BYTES);
  const authTag = envelope.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = envelope.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
