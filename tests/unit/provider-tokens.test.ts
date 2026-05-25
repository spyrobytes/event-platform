import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";

import { encryptToken, decryptToken } from "@/lib/provider-tokens";
import {
  generateStateNonce,
  signOAuthState,
  verifyOAuthState,
  InvalidOAuthStateError,
} from "@/lib/oauth-state";

const ORIGINAL_ENC_KEY = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
const ORIGINAL_SIG_KEY = process.env.OAUTH_STATE_SIGNING_KEY;

beforeAll(() => {
  process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.OAUTH_STATE_SIGNING_KEY = randomBytes(32).toString("base64");
});

afterAll(() => {
  process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = ORIGINAL_ENC_KEY;
  process.env.OAUTH_STATE_SIGNING_KEY = ORIGINAL_SIG_KEY;
});

describe("provider-tokens — encryption round-trip", () => {
  it("encrypt then decrypt returns the original plaintext", () => {
    const plain = "ya29.A0AfH6SMBxFakeAccessTokenValue1234567890";
    const env = encryptToken(plain);
    expect(decryptToken(env)).toBe(plain);
  });

  it("each encryption uses a fresh IV (envelopes differ)", () => {
    const plain = "same-plaintext";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(Buffer.compare(a, b)).not.toBe(0);
    expect(decryptToken(a)).toBe(plain);
    expect(decryptToken(b)).toBe(plain);
  });

  it("decrypt rejects a tampered ciphertext (auth tag mismatch)", () => {
    const env = encryptToken("secret");
    // Flip one bit in the ciphertext portion (after iv + tag).
    const tampered = Buffer.from(env);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("decrypt rejects a truncated envelope", () => {
    expect(() => decryptToken(Buffer.alloc(10))).toThrow(/truncated/i);
  });

  it("encrypt throws a helpful error when the key env is missing", () => {
    const prior = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
    delete process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
    try {
      expect(() => encryptToken("x")).toThrow(/PROVIDER_TOKEN_ENCRYPTION_KEY/);
    } finally {
      process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = prior;
    }
  });

  it("encrypt throws when the key decodes to the wrong length", () => {
    const prior = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
    process.env.PROVIDER_TOKEN_ENCRYPTION_KEY =
      Buffer.alloc(16).toString("base64");
    try {
      expect(() => encryptToken("x")).toThrow(/32 bytes/);
    } finally {
      process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = prior;
    }
  });

  it("decrypts long inputs (refresh tokens are big)", () => {
    const plain = "x".repeat(2048);
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });
});

describe("oauth-state — sign / verify", () => {
  it("verify accepts a freshly signed payload", () => {
    const cookie = signOAuthState({
      userId: "user_123",
      state: generateStateNonce(),
      verifier: generateStateNonce(),
    });
    const payload = verifyOAuthState(cookie);
    expect(payload.userId).toBe("user_123");
    expect(payload.exp).toBeGreaterThan(Date.now());
  });

  it("verify rejects a tampered signature", () => {
    const cookie = signOAuthState({
      userId: "u",
      state: "s",
      verifier: "v",
    });
    const dot = cookie.indexOf(".");
    const tampered = cookie.slice(0, dot + 1) + "AAAAAAAA";
    expect(() => verifyOAuthState(tampered)).toThrow(InvalidOAuthStateError);
  });

  it("verify rejects a tampered payload", () => {
    const cookie = signOAuthState({
      userId: "u",
      state: "s",
      verifier: "v",
    });
    const dot = cookie.indexOf(".");
    // Swap a character in the JSON body; sig won't match.
    const payload = cookie.slice(0, dot);
    const flipped = (payload[0] === "a" ? "b" : "a") + payload.slice(1);
    expect(() => verifyOAuthState(flipped + cookie.slice(dot))).toThrow(
      InvalidOAuthStateError,
    );
  });

  it("verify rejects expired state", () => {
    const cookie = signOAuthState({
      userId: "u",
      state: "s",
      verifier: "v",
      exp: Date.now() - 1000,
    });
    expect(() => verifyOAuthState(cookie)).toThrow(/expired/i);
  });

  it("verify rejects malformed cookie value (no dot)", () => {
    expect(() => verifyOAuthState("not-a-signed-cookie")).toThrow(
      InvalidOAuthStateError,
    );
  });

  it("verify rejects payload missing required fields", async () => {
    // Hand-craft a payload missing `verifier`. Sign it with the real key
    // so the signature matches but the shape check fails.
    const { createHmac } = await import("node:crypto");
    const json = Buffer.from(
      JSON.stringify({ userId: "u", state: "s", exp: Date.now() + 1000 }),
      "utf8",
    ).toString("base64url");
    const sig = createHmac(
      "sha256",
      Buffer.from(process.env.OAUTH_STATE_SIGNING_KEY!, "base64"),
    )
      .update(json)
      .digest("base64url");
    expect(() => verifyOAuthState(`${json}.${sig}`)).toThrow(/shape/i);
  });
});
