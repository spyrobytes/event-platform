import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";

import {
  encryptInviteToken,
  decryptInviteToken,
  inviteTokenEncryptionEnabled,
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

  it("reports encryption enabled", () => {
    expect(inviteTokenEncryptionEnabled()).toBe(true);
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

  it("reports encryption disabled", () => {
    expect(inviteTokenEncryptionEnabled()).toBe(false);
  });

  it("encrypt returns null", () => {
    expect(encryptInviteToken("anything")).toBeNull();
  });

  it("decrypt returns null", () => {
    expect(decryptInviteToken(new Uint8Array([1, 2, 3, 4]))).toBeNull();
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
