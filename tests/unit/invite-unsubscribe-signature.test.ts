import { describe, it, expect, beforeAll } from "vitest";

// The signature module reads RSVP_CODE_HMAC_KEY at call time via the
// validated env proxy. Tests run with NODE_ENV=test so the proxy bypasses
// validation and reads process.env directly — set the key first.
beforeAll(() => {
  process.env.RSVP_CODE_HMAC_KEY = "a".repeat(48);
});

const {
  signInviteUnsubscribe,
  verifyInviteUnsubscribe,
  buildInviteUnsubscribeUrl,
} = await import("@/lib/invite-unsubscribe-signature");

describe("signInviteUnsubscribe", () => {
  it("produces a 64-char lowercase hex digest", () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    expect(signInviteUnsubscribe("inv_1", "evt_1")).toBe(
      signInviteUnsubscribe("inv_1", "evt_1"),
    );
  });

  it("changes when inviteId changes", () => {
    expect(signInviteUnsubscribe("inv_1", "evt_1")).not.toBe(
      signInviteUnsubscribe("inv_2", "evt_1"),
    );
  });

  it("changes when eventId changes", () => {
    expect(signInviteUnsubscribe("inv_1", "evt_1")).not.toBe(
      signInviteUnsubscribe("inv_1", "evt_2"),
    );
  });
});

describe("verifyInviteUnsubscribe", () => {
  it("accepts a valid signature", () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    expect(verifyInviteUnsubscribe("inv_1", "evt_1", sig)).toBe(true);
  });

  it("rejects a signature whose inviteId was swapped", () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    expect(verifyInviteUnsubscribe("inv_2", "evt_1", sig)).toBe(false);
  });

  it("rejects a signature whose eventId was swapped", () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    expect(verifyInviteUnsubscribe("inv_1", "evt_2", sig)).toBe(false);
  });

  it("rejects a tampered (flipped-byte) signature", () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    const flipped =
      sig[0] === "a" ? `b${sig.slice(1)}` : `a${sig.slice(1)}`;
    expect(verifyInviteUnsubscribe("inv_1", "evt_1", flipped)).toBe(false);
  });

  it("rejects a signature with mismatched length without throwing", () => {
    expect(verifyInviteUnsubscribe("inv_1", "evt_1", "")).toBe(false);
    expect(verifyInviteUnsubscribe("inv_1", "evt_1", "too-short")).toBe(false);
    expect(
      verifyInviteUnsubscribe("inv_1", "evt_1", "z".repeat(128)),
    ).toBe(false);
  });
});

describe("buildInviteUnsubscribeUrl", () => {
  it("encodes the three params as a query string under /unsubscribe/by-id", () => {
    const url = buildInviteUnsubscribeUrl(
      "https://example.com",
      "inv_1",
      "evt_1",
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://example.com");
    expect(parsed.pathname).toBe("/unsubscribe/by-id");
    expect(parsed.searchParams.get("inviteId")).toBe("inv_1");
    expect(parsed.searchParams.get("eventId")).toBe("evt_1");
    const sig = parsed.searchParams.get("sig");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyInviteUnsubscribe("inv_1", "evt_1", sig!)).toBe(true);
  });
});
