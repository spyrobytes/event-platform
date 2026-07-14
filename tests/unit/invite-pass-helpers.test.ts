import { describe, it, expect } from "vitest";
import {
  detectAccessState,
  resolveGuestName,
  resolvePartyLabel,
  resolvePartyMembers,
  resolvePassMoment,
  UUID_PATTERN,
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

describe("resolvePartyMembers", () => {
  it("returns the additional guest names when present", () => {
    expect(
      resolvePartyMembers({
        rsvp: { additionalGuestNames: ["Bob", "Carol"] },
      })
    ).toEqual(["Bob", "Carol"]);
  });

  it("returns empty when no RSVP exists", () => {
    expect(resolvePartyMembers({ rsvp: null })).toEqual([]);
  });

  it("filters empty / whitespace-only entries", () => {
    expect(
      resolvePartyMembers({
        rsvp: { additionalGuestNames: ["Bob", "", "  ", "Carol"] },
      })
    ).toEqual(["Bob", "Carol"]);
  });

  it("trims surrounding whitespace from each name", () => {
    expect(
      resolvePartyMembers({
        rsvp: { additionalGuestNames: ["  Bob  ", "Carol "] },
      })
    ).toEqual(["Bob", "Carol"]);
  });
});

describe("resolvePassMoment", () => {
  const RECEPTION = T("2026-06-21T18:00:00Z");
  const EVENT_START = T("2026-06-21T14:00:00Z");

  const eventBase = {
    startAt: EVENT_START,
    venueName: "St. Mary's Cathedral",
    address: "100 Cathedral Pl",
  };

  it("uses reception fields when receptionStartAt is set", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        invitationConfig: {
          receptionStartAt: RECEPTION,
          receptionVenue: "The Royal Hall",
          receptionAddress: "123 Main St",
        },
      },
    });
    expect(result).toEqual({
      label: "Reception",
      startAt: RECEPTION,
      venue: "The Royal Hall",
      address: "123 Main St",
    });
  });

  it("prefers the typed schedule's reception entry over legacy config (rung 1)", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        schedule: [
          {
            id: "e1",
            label: "Ceremony",
            role: "ceremony",
            startAt: "2026-06-21T14:00:00.000Z",
            isAccessPassGated: false,
          },
          {
            id: "e2",
            label: "Evening Reception",
            role: "reception",
            startAt: "2026-06-21T19:00:00.000Z",
            venue: "The Orangery",
            address: "5 Garden Walk",
            isAccessPassGated: false,
          },
        ],
        invitationConfig: {
          receptionStartAt: RECEPTION, // legacy disagrees — typed must win
          receptionVenue: "The Royal Hall",
          receptionAddress: "123 Main St",
        },
      },
    });
    expect(result).toEqual({
      label: "Evening Reception", // organizer's label, not hardcoded English
      startAt: T("2026-06-21T19:00:00Z"),
      venue: "The Orangery",
      address: "5 Garden Walk",
    });
  });

  it("uses the first isAccessPassGated entry when no reception role exists (rung 2)", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        schedule: [
          {
            id: "e1",
            label: "Welcome Dinner",
            role: "welcome",
            startAt: "2026-06-20T18:00:00.000Z",
            isAccessPassGated: true,
          },
        ],
        invitationConfig: null,
      },
    });
    expect(result.label).toBe("Welcome Dinner");
    expect(result.startAt).toEqual(T("2026-06-20T18:00:00Z"));
  });

  it("reception role outranks a gated entry under today's ladder (revisit when the flag is user-settable)", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        schedule: [
          {
            id: "e1",
            label: "Ceremony",
            role: "ceremony",
            startAt: "2026-06-21T14:00:00.000Z",
            isAccessPassGated: true, // gated — but rung 1 wins today
          },
          {
            id: "e2",
            label: "Reception",
            role: "reception",
            startAt: "2026-06-21T19:00:00.000Z",
            isAccessPassGated: false,
          },
        ],
        invitationConfig: null,
      },
    });
    expect(result.label).toBe("Reception");
    expect(result.startAt).toEqual(T("2026-06-21T19:00:00Z"));
  });

  it("falls through to legacy config when the schedule has no reception or gated entry", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        schedule: [
          {
            id: "e1",
            label: "Ceremony",
            role: "ceremony",
            startAt: "2026-06-21T14:00:00.000Z",
            isAccessPassGated: false,
          },
        ],
        invitationConfig: {
          receptionStartAt: RECEPTION,
          receptionVenue: "The Royal Hall",
          receptionAddress: "123 Main St",
        },
      },
    });
    expect(result.label).toBe("Reception");
    expect(result.startAt).toBe(RECEPTION);
  });

  it("treats a malformed schedule column as absent (legacy fallback, no throw)", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        schedule: [{ nonsense: true }],
        invitationConfig: {
          receptionStartAt: RECEPTION,
          receptionVenue: "The Royal Hall",
          receptionAddress: "123 Main St",
        },
      },
    });
    expect(result.label).toBe("Reception");
    expect(result.startAt).toBe(RECEPTION);
  });

  it("falls back to event.startAt when receptionStartAt is null", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        invitationConfig: {
          receptionStartAt: null,
          receptionVenue: null,
          receptionAddress: null,
        },
      },
    });
    expect(result).toEqual({
      label: null,
      startAt: EVENT_START,
      venue: "St. Mary's Cathedral",
      address: "100 Cathedral Pl",
    });
  });

  it("falls back to event.startAt when there is no invitationConfig at all", () => {
    const result = resolvePassMoment({
      event: { ...eventBase, invitationConfig: null },
    });
    expect(result.label).toBeNull();
    expect(result.startAt).toBe(EVENT_START);
    expect(result.venue).toBe("St. Mary's Cathedral");
    expect(result.address).toBe("100 Cathedral Pl");
  });

  it("preserves null venue/address when reception is set without those fields", () => {
    const result = resolvePassMoment({
      event: {
        ...eventBase,
        invitationConfig: {
          receptionStartAt: RECEPTION,
          receptionVenue: null,
          receptionAddress: null,
        },
      },
    });
    expect(result.label).toBe("Reception");
    expect(result.venue).toBeNull();
    expect(result.address).toBeNull();
  });
});

describe("UUID_PATTERN", () => {
  it("matches canonical UUIDs and rejects malformed input", () => {
    // Canonical
    expect(UUID_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeeffff")).toBe(true);
    expect(UUID_PATTERN.test("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF")).toBe(true);
    // Malformed — none of these should reach the DB on the page route
    expect(UUID_PATTERN.test("not-a-uuid")).toBe(false);
    expect(UUID_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeefff")).toBe(false); // 1 char short
    expect(UUID_PATTERN.test("0123abcdaaaabbbbccccddddeeeeffff")).toBe(false); // no dashes
    expect(UUID_PATTERN.test("")).toBe(false);
    expect(UUID_PATTERN.test("0123abcd-aaaa-bbbb-cccc-ddddeeeeffff' OR '1'='1")).toBe(false);
  });
});
