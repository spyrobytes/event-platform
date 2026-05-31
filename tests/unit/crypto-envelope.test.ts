import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";

import { aesGcmEncrypt, aesGcmDecrypt, loadAes256Key } from "@/lib/crypto-envelope";

const KEY = randomBytes(32);

describe("crypto-envelope — AES-256-GCM round-trip", () => {
  it("encrypt then decrypt returns the original plaintext", () => {
    const plain = "the-secret-token-value-1234567890";
    expect(aesGcmDecrypt(aesGcmEncrypt(plain, KEY), KEY)).toBe(plain);
  });

  it("uses a fresh IV per call (envelopes differ)", () => {
    const a = aesGcmEncrypt("same-plaintext", KEY);
    const b = aesGcmEncrypt("same-plaintext", KEY);
    expect(Buffer.compare(Buffer.from(a), Buffer.from(b))).not.toBe(0);
    expect(aesGcmDecrypt(a, KEY)).toBe("same-plaintext");
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const env = aesGcmEncrypt("secret", KEY);
    const tampered = Buffer.from(env);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => aesGcmDecrypt(tampered, KEY)).toThrow();
  });

  it("rejects decryption under a different key", () => {
    const env = aesGcmEncrypt("secret", KEY);
    expect(() => aesGcmDecrypt(env, randomBytes(32))).toThrow();
  });

  it("rejects a truncated envelope", () => {
    expect(() => aesGcmDecrypt(Buffer.alloc(10), KEY)).toThrow(/truncated/i);
  });

  it("round-trips long inputs", () => {
    const plain = "x".repeat(4096);
    expect(aesGcmDecrypt(aesGcmEncrypt(plain, KEY), KEY)).toBe(plain);
  });

  it("round-trips an empty plaintext (zero-length ciphertext)", () => {
    // The envelope is iv(12)+tag(16)+0 = 28 bytes; the truncation guard must
    // accept it rather than reject a legitimately-encrypted empty string.
    expect(aesGcmDecrypt(aesGcmEncrypt("", KEY), KEY)).toBe("");
  });
});

describe("crypto-envelope — loadAes256Key", () => {
  const VAR = "TEST_AES_KEY_VAR_DO_NOT_USE";

  it("loads a valid base64 32-byte key", () => {
    process.env[VAR] = randomBytes(32).toString("base64");
    try {
      expect(loadAes256Key(VAR)).toHaveLength(32);
    } finally {
      delete process.env[VAR];
    }
  });

  it("throws an error naming the env var when missing", () => {
    delete process.env[VAR];
    expect(() => loadAes256Key(VAR)).toThrow(new RegExp(VAR));
  });

  it("throws when the key decodes to the wrong length", () => {
    process.env[VAR] = Buffer.alloc(16).toString("base64");
    try {
      expect(() => loadAes256Key(VAR)).toThrow(/32 bytes/);
    } finally {
      delete process.env[VAR];
    }
  });
});
