import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// Pepper must be set BEFORE the route module imports rsvp-code (which calls
// env.RSVP_CODE_HMAC_KEY at hash time).
beforeAll(() => {
  process.env.RSVP_CODE_HMAC_KEY = "test-pepper-with-at-least-32-characters-padding";
});

// Mock the DB layer so we can drive findUnique outcomes per test.
const dbMock = {
  event: { findUnique: vi.fn() },
  invite: { findUnique: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

// Mock the session layer — we only verify that the route calls into it
// correctly; rsvp-session itself has its own unit tests.
const createSessionMock = vi.fn(async () => ({
  rawToken: "raw-session-token",
  session: { id: "sess-1" },
}));
vi.mock("@/lib/rsvp-session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rsvp-session")>(
    "@/lib/rsvp-session"
  );
  return {
    ...actual,
    createRsvpSession: createSessionMock,
  };
});

// Rate-limit module — let real upstashLimiter return null in test (no Upstash
// env set), so checkUpstashLimit always returns true. We don't need to mock
// this; the dev-fallback path is exactly what the test sees.

const { POST } = await import("@/app/api/rsvp/public/verify-code/route");

function makeRequest(body: unknown, ip = "203.0.113.42"): NextRequest {
  return new NextRequest("https://example.com/api/rsvp/public/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
const pastDate = new Date(Date.now() - 1000);

const validEvent = {
  id: "evt_1",
  status: "PUBLISHED",
  rsvpDeadline: futureDate,
  startAt: futureDate,
};

const validInvite = {
  id: "inv_1",
  eventId: "evt_1",
  name: "Alice",
  email: "alice@example.com",
  plusOnesAllowed: 2,
  status: "PENDING",
  expiresAt: null,
};

beforeEach(() => {
  dbMock.event.findUnique.mockReset();
  dbMock.invite.findUnique.mockReset();
  createSessionMock.mockClear();
});

describe("POST /api/rsvp/public/verify-code", () => {
  it("returns 200 with safe preview + sets session cookie on valid code", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue(validInvite);

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.invitePreview).toEqual({
      name: "Alice",
      hasEmail: true,
      plusOnesAllowed: 2,
    });
    expect(body.data.rsvpSessionToken).toBe("raw-session-token");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/rsvp_session=raw-session-token/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\/api\/rsvp\/public/);
    expect(setCookie).toMatch(/Max-Age=1200/);
  });

  it("doesn't leak email when invite has no email on file", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, email: null });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    const body = await res.json();
    expect(body.data.invitePreview.hasEmail).toBe(false);
    // Raw email value never appears in response body.
    expect(JSON.stringify(body)).not.toContain("alice@example.com");
  });

  it("normalizes lowercase + hyphenated codes to the same hash", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue(validInvite);

    await POST(makeRequest({ eventId: "evt_1", code: "evg-abcd-efgh-ijkl" }));
    await POST(makeRequest({ eventId: "evt_1", code: "EVG ABCD EFGH IJKL" }));

    const calls = dbMock.invite.findUnique.mock.calls;
    expect(calls[0][0].where.rsvpCodeHash).toBe(calls[1][0].where.rsvpCodeHash);
  });

  it("returns generic INVALID for an unknown code", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ZZZZ-ZZZZ-ZZZZ" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID");
    expect(body.error).toMatch(/couldn't verify/i);
  });

  it("returns generic INVALID when invite belongs to a different event", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, eventId: "different-event" });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID");
  });

  it("returns generic INVALID when invite is REVOKED", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, status: "REVOKED" });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
  });

  it("returns generic INVALID when invite has expired", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, expiresAt: pastDate });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
  });

  it("returns generic INVALID when event is DRAFT (does not leak existence)", async () => {
    dbMock.event.findUnique.mockResolvedValue({ ...validEvent, status: "DRAFT" });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
    // Invite lookup never fires when the event is not RSVP-able.
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
  });

  it("returns generic INVALID when event does not exist", async () => {
    dbMock.event.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ eventId: "missing", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
  });

  it("returns DEADLINE_PASSED when rsvpDeadline is in the past", async () => {
    dbMock.event.findUnique.mockResolvedValue({ ...validEvent, rsvpDeadline: pastDate });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("DEADLINE_PASSED");
  });

  it("treats null rsvpDeadline as no deadline", async () => {
    dbMock.event.findUnique.mockResolvedValue({ ...validEvent, rsvpDeadline: null });
    dbMock.invite.findUnique.mockResolvedValue(validInvite);

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(200);
  });

  it("returns EVENT_ENDED when startAt is in the past", async () => {
    dbMock.event.findUnique.mockResolvedValue({ ...validEvent, startAt: pastDate });

    const res = await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("EVENT_ENDED");
  });

  it("returns generic INVALID when honeypot is filled", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue(validInvite);

    const res = await POST(
      makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL", hp: "I am a bot" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
    // No DB calls should fire — honeypot short-circuits before lookup.
    expect(dbMock.event.findUnique).not.toHaveBeenCalled();
  });

  it("returns generic INVALID for a malformed body (Zod failure)", async () => {
    const res = await POST(makeRequest({ eventId: "" /* empty */, code: "" /* empty */ }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
  });

  it("returns generic INVALID when code normalizes to empty", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);

    const res = await POST(makeRequest({ eventId: "evt_1", code: "----   ---" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID");
    // No DB lookups — short-circuited before event/invite queries.
    expect(dbMock.event.findUnique).not.toHaveBeenCalled();
  });

  it("does not create a session when the request fails", async () => {
    dbMock.event.findUnique.mockResolvedValue(null);
    await POST(makeRequest({ eventId: "x", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates exactly one session per successful verification", async () => {
    dbMock.event.findUnique.mockResolvedValue(validEvent);
    dbMock.invite.findUnique.mockResolvedValue(validInvite);

    await POST(makeRequest({ eventId: "evt_1", code: "EVG-ABCD-EFGH-IJKL" }));
    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock.mock.calls[0][1]).toEqual({
      eventId: "evt_1",
      inviteId: "inv_1",
    });
  });
});
