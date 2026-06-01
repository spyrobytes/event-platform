import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

import {
  encryptInviteToken,
  decryptInviteToken,
} from "@/lib/invite-token-crypto";

const ORIGINAL = process.env.INVITE_TOKEN_ENC_KEY;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.INVITE_TOKEN_ENC_KEY;
  else process.env.INVITE_TOKEN_ENC_KEY = ORIGINAL;
});

describe("invite-token-crypto — key configured", () => {
  beforeEach(() => {
    process.env.INVITE_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a raw invite token", () => {
    const token = "abc.def-base64url-invite-token-value";
    const envelope = encryptInviteToken(token);
    expect(envelope).not.toBeNull();
    expect(decryptInviteToken(envelope)).toBe(token);
  });

  it("returns null (no throw) for a tampered envelope", () => {
    const envelope = Buffer.from(encryptInviteToken("secret")!);
    envelope[envelope.length - 1] ^= 0x01;
    expect(decryptInviteToken(envelope)).toBeNull();
  });
});

describe("invite-token-crypto — no key (graceful degradation)", () => {
  beforeEach(() => {
    delete process.env.INVITE_TOKEN_ENC_KEY;
  });

  it("encrypt returns null", () => {
    expect(encryptInviteToken("anything")).toBeNull();
  });

  it("decrypt returns null", () => {
    expect(decryptInviteToken(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe("invite-token-crypto — malformed key (graceful, never blocks)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Key is SET but only 16 bytes (not 32) — loadAes256Key would throw.
    process.env.INVITE_TOKEN_ENC_KEY = randomBytes(16).toString("base64");
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("encrypt returns null instead of throwing (degrades, doesn't break creation)", () => {
    expect(() => encryptInviteToken("tok")).not.toThrow();
    expect(encryptInviteToken("tok")).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("decrypt returns null for a malformed key", () => {
    expect(decryptInviteToken(new Uint8Array(40))).toBeNull();
  });
});

describe("invite-token-crypto — key rotation", () => {
  it("decrypt returns null when the key has been rotated", () => {
    process.env.INVITE_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
    const envelope = encryptInviteToken("secret");
    expect(envelope).not.toBeNull();

    // Rotate the key — the old envelope is no longer decryptable, but this
    // must degrade to null (durability lost) rather than throw.
    process.env.INVITE_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
    expect(decryptInviteToken(envelope)).toBeNull();
  });
});
