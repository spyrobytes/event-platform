import { describe, it, expect } from "vitest";
import {
  detectAccessState,
  resolveGuestName,
  resolvePartyLabel,
  UUID_V4_PATTERN,
} from "@/app/invite/pass/[passId]/_helpers";

const T = (iso: string) => new Date(iso);
const NOW = T("2026-06-01T12:00:00Z").getTime();

const baseEvent = { status: "PUBLISHED", endAt: null as Date | null };
const baseInvite = {
  revokedAt: null as Date | null,
  expiresAt: null as Date | null,
  event: baseEvent,
};

describe("detectAccessState", () => {
  it("returns ok when no blocking condition holds", () => {
    expect(detectAccessState(baseInvite, NOW)).toEqual({ kind: "ok" });
  });

  it("returns revoked when revokedAt is set, regardless of other state", () => {
    const result = detectAccessState(
      {
        revokedAt: T("2026-05-01T00:00:00Z"),
        expiresAt: null,
        event: { status: "CANCELLED", endAt: T("2026-04-01T00:00:00Z") },
      },
      NOW
    );
    expect(result).toEqual({ kind: "revoked" });
  });

  it("returns cancelled when event status is CANCELLED and not revoked", () => {
    const result = detectAccessState(
      { ...baseInvite, event: { status: "CANCELLED", endAt: null } },
      NOW
    );
    expect(result).toEqual({ kind: "cancelled" });
  });

  it("returns expired when expiresAt is in the past and event is fine", () => {
    const result = detectAccessState(
      { ...baseInvite, expiresAt: T("2026-05-01T00:00:00Z") },
      NOW
    );
    expect(result).toEqual({ kind: "expired" });
  });

  it("returns ok when expiresAt is in the future", () => {
    const result = detectAccessState(
      { ...baseInvite, expiresAt: T("2026-07-01T00:00:00Z") },
      NOW
    );
    expect(result).toEqual({ kind: "ok" });
  });

  it("returns ended when event.endAt is in the past", () => {
    const result = detectAccessState(
      { ...baseInvite, event: { status: "PUBLISHED", endAt: T("2026-05-01T00:00:00Z") } },
      NOW
    );
    expect(result).toEqual({ kind: "ended" });
  });

  it("does NOT return ended when event.endAt is null (no reliable signal)", () => {
    const result = detectAccessState(
      { ...baseInvite, event: { status: "PUBLISHED", endAt: null } },
      NOW
    );
    expect(result).toEqual({ kind: "ok" });
  });

  it("returns ok when event.endAt is in the future", () => {
    const result = detectAccessState(
      { ...baseInvite, event: { status: "PUBLISHED", endAt: T("2026-07-01T00:00:00Z") } },
      NOW
    );
    expect(result).toEqual({ kind: "ok" });
  });

  it("priority: revoked beats cancelled beats expired beats ended", () => {
    const all = {
      revokedAt: T("2026-05-01T00:00:00Z"),
      expiresAt: T("2026-05-01T00:00:00Z"),
      event: { status: "CANCELLED", endAt: T("2026-05-01T00:00:00Z") },
    };
    expect(detectAccessState(all, NOW).kind).toBe("revoked");
    expect(
      detectAccessState({ ...all, revokedAt: null }, NOW).kind
    ).toBe("cancelled");
    expect(
      detectAccessState(
        { ...all, revokedAt: null, event: { ...all.event, status: "PUBLISHED" } },
        NOW
      ).kind
    ).toBe("expired");
    expect(
      detectAccessState(
        {
          revokedAt: null,
          expiresAt: null,
          event: { status: "PUBLISHED", endAt: T("2026-05-01T00:00:00Z") },
        },
        NOW
      ).kind
    ).toBe("ended");
  });
});

describe("resolveGuestName", () => {
  it("uses rsvp.guestName when present (the guest's own choice wins)", () => {
    expect(
      resolveGuestName({
        name: "Alice From Org",
        email: "alice@example.com",
        rsvp: { guestName: "Alice Brown-Hayes" },
      })
    ).toBe("Alice Brown-Hayes");
  });

  it("falls back to invite.name when no RSVP exists", () => {
    expect(
      resolveGuestName({
        name: "Alice From Org",
        email: "alice@example.com",
        rsvp: null,
      })
    ).toBe("Alice From Org");
  });

  it("falls back to email local-part when name is null", () => {
    expect(
      resolveGuestName({ name: null, email: "alice@example.com", rsvp: null })
    ).toBe("alice");
  });

  it("falls back to 'Guest' when nothing else is set", () => {
    expect(resolveGuestName({ name: null, email: null, rsvp: null })).toBe("Guest");
  });

  it("treats an empty rsvp.guestName as missing", () => {
    expect(
      resolveGuestName({
        name: "Alice From Org",
        email: null,
        rsvp: { guestName: "" },
      })
    ).toBe("Alice From Org");
  });
});

describe("resolvePartyLabel", () => {
  it("returns 'Party of N' when an RSVP recorded multiple guests", () => {
    expect(resolvePartyLabel({ plusOnesAllowed: 0, rsvp: { guestCount: 3 } })).toBe(
      "Party of 3"
    );
  });

  it("returns null when an RSVP exists with guestCount 1 (solo guest, no caption)", () => {
    expect(resolvePartyLabel({ plusOnesAllowed: 2, rsvp: { guestCount: 1 } })).toBeNull();
  });

  it("returns 'Up to N guests' when no RSVP and plus-ones are allowed", () => {
    expect(resolvePartyLabel({ plusOnesAllowed: 2, rsvp: null })).toBe(
      "Up to 3 guests"
    );
  });

  it("returns null when no RSVP and no plus-ones allowed", () => {
    expect(resolvePartyLabel({ plusOnesAllowed: 0, rsvp: null })).toBeNull();
  });

  it("prefers the actual RSVP count over the original plus-ones cap", () => {
    // Organizer allowed 4 plus-ones; guest only brought 1 extra.
    expect(resolvePartyLabel({ plusOnesAllowed: 4, rsvp: { guestCount: 2 } })).toBe(
      "Party of 2"
    );
  });
});

describe("UUID_V4_PATTERN", () => {
  it("matches canonical UUID v4 strings", () => {
    expect(UUID_V4_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeeffff")).toBe(true);
    expect(UUID_V4_PATTERN.test("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF")).toBe(true);
  });

  it("rejects malformed input (no DB hit on the page route)", () => {
    expect(UUID_V4_PATTERN.test("not-a-uuid")).toBe(false);
    expect(UUID_V4_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeefff")).toBe(false); // 1 char short
    expect(UUID_V4_PATTERN.test("0123abcdaaaabbbbccccddddeeeeffff")).toBe(false); // no dashes
    expect(UUID_V4_PATTERN.test("")).toBe(false);
    expect(UUID_V4_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeeffff' OR '1'='1")).toBe(false);
  });
});
