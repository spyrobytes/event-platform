import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.RSVP_CODE_HMAC_KEY =
    "test-pepper-with-at-least-32-characters-padding";
});

// DB layer — every method we touch needs a mock.
const dbMock = {
  invite: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  rSVP: { upsert: vi.fn() },
  emailOutbox: { create: vi.fn() },
  rsvpSession: { findUnique: vi.fn(), updateMany: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (fn) => {
    // Run the callback against `dbMock` itself — call sites use `tx.X`, and
    // dbMock.X is the same mock surface they use outside the transaction.
    return fn(dbMock);
  }),
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

// Email module — we only verify the route enqueues correctly; the actual
// send is deferred via `scheduleEmailProcessing` so we make it a no-op.
// Typed against the real module so `mock.calls[i][j]` indexing keeps a
// proper tuple shape under tsc.
type QueueConfirmationEmail = typeof import("@/lib/email").queueConfirmationEmail;
type ScheduleEmailProcessing = typeof import("@/lib/email").scheduleEmailProcessing;
const queueConfirmationEmailMock = vi.fn<QueueConfirmationEmail>(
  async () => "email-1"
);
const scheduleEmailProcessingMock = vi.fn<ScheduleEmailProcessing>(() => {});
vi.mock("@/lib/email", () => ({
  queueConfirmationEmail: queueConfirmationEmailMock,
  scheduleEmailProcessing: scheduleEmailProcessingMock,
  // Real buildUnsubscribeUrl is a pure formatter — keep the mock equivalently
  // pure so the route's email payload assertions can match the URL shape.
  buildUnsubscribeUrl: (rawToken: string) =>
    `https://eventfxr.test/unsubscribe/${rawToken}`,
}));

const { POST } = await import("@/app/api/rsvp/public/submit/route");

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 1000);

const validSession = {
  id: "sess_1",
  inviteId: "inv_1",
  eventId: "evt_1",
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
};

const validInvite = {
  id: "inv_1",
  eventId: "evt_1",
  email: "alice@example.com",
  plusOnesAllowed: 2,
  status: "PENDING",
  expiresAt: null,
  rsvpCodeUsedAt: null,
  rsvp: null,
  event: {
    id: "evt_1",
    title: "Wedding",
    slug: "alice-bob-wedding",
    status: "PUBLISHED",
    maxAttendees: null,
    rsvpDeadline: futureDate,
    startAt: futureDate,
    timezone: "UTC",
    venueName: "The Hall",
    city: "NYC",
    creator: { name: "Alice", email: "alice@example.com" },
  },
};

function makeRequest(
  body: Record<string, unknown>,
  options: { sessionCookie?: string } = {}
): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.sessionCookie !== undefined) {
    headers.cookie = `rsvp_session=${options.sessionCookie}`;
  }
  return new NextRequest("https://example.com/api/rsvp/public/submit", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  guestName: "Alice",
  response: "YES",
  guestCount: 1,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: session lookup returns valid; invite lookup returns valid.
  dbMock.rsvpSession.findUnique.mockResolvedValue(validSession);
  dbMock.invite.findUnique.mockResolvedValue(validInvite);
  dbMock.invite.findFirst.mockResolvedValue(null);
  dbMock.rSVP.upsert.mockImplementation(({ create }: { create: Record<string, unknown> }) =>
    Promise.resolve({
      id: "rsvp_1",
      response: create.response,
      guestName: create.guestName,
      guestCount: create.guestCount,
      additionalGuestNames: create.additionalGuestNames,
      respondedAt: new Date(),
    })
  );
  dbMock.invite.update.mockResolvedValue({});
  dbMock.rsvpSession.updateMany.mockResolvedValue({ count: 1 });
  dbMock.$queryRaw.mockResolvedValue([{ max_attendees: null }]);
  // $transaction comes pre-wired in the mock declaration.
  dbMock.$transaction.mockImplementation(async (fn) => fn(dbMock));
});

describe("POST /api/rsvp/public/submit — happy path", () => {
  it("YES creates RSVP, marks invite RESPONDED, consumes session, queues email", async () => {
    const res = await POST(
      makeRequest(validBody, { sessionCookie: "raw-token" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.rsvp.response).toBe("YES");
    expect(body.data.event).toEqual({
      id: "evt_1",
      title: "Wedding",
      slug: "alice-bob-wedding",
    });

    // RSVP upsert with source set
    const upsertCall = dbMock.rSVP.upsert.mock.calls[0][0];
    expect(upsertCall.create.source).toBe("PUBLIC_PORTAL_CODE");
    expect(upsertCall.update.source).toBe("PUBLIC_PORTAL_CODE");

    // Invite marked RESPONDED + rsvpCodeUsedAt stamped
    const inviteUpdate = dbMock.invite.update.mock.calls[0][0];
    expect(inviteUpdate.data.status).toBe("RESPONDED");
    expect(inviteUpdate.data.rsvpCodeUsedAt).toBeInstanceOf(Date);

    // Session consumed via conditional updateMany (usedAt IS NULL guard)
    expect(dbMock.rsvpSession.updateMany).toHaveBeenCalledWith({
      where: { id: "sess_1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });

    // Confirmation email queued inside the transaction
    expect(queueConfirmationEmailMock).toHaveBeenCalledTimes(1);
    expect(queueConfirmationEmailMock.mock.calls[0][0]).toBe("inv_1");
    expect(queueConfirmationEmailMock.mock.calls[0][1]).toBe("alice@example.com");

    // Cookie cleared on success
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/rsvp_session=;/);
    expect(setCookie).toMatch(/Max-Age=0/);
  });

  it("NO creates RSVP with response NO, status RESPONDED", async () => {
    const res = await POST(
      makeRequest({ ...validBody, response: "NO" }, { sessionCookie: "tok" })
    );
    expect(res.status).toBe(200);
    expect(dbMock.rSVP.upsert.mock.calls[0][0].create.response).toBe("NO");
    expect(dbMock.invite.update.mock.calls[0][0].data.status).toBe("RESPONDED");
  });

  it("MAYBE creates RSVP with response MAYBE", async () => {
    const res = await POST(
      makeRequest({ ...validBody, response: "MAYBE" }, { sessionCookie: "tok" })
    );
    expect(res.status).toBe(200);
    expect(dbMock.rSVP.upsert.mock.calls[0][0].create.response).toBe("MAYBE");
  });

  it("falls back to body session token when cookie is absent", async () => {
    const res = await POST(makeRequest({ ...validBody, rsvpSessionToken: "body-token" }));
    expect(res.status).toBe(200);
    expect(dbMock.rsvpSession.findUnique).toHaveBeenCalled();
  });
});

describe("session validity", () => {
  it("rejects when neither cookie nor body carries a session token", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_INVALID");
    // No DB work should have happened.
    expect(dbMock.rsvpSession.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when session lookup returns null (expired/used/missing)", async () => {
    dbMock.rsvpSession.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_INVALID");
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("rejects when session is already used", async () => {
    dbMock.rsvpSession.findUnique.mockResolvedValue({
      ...validSession,
      usedAt: new Date(),
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_INVALID");
  });

  it("rejects when session has expired", async () => {
    dbMock.rsvpSession.findUnique.mockResolvedValue({
      ...validSession,
      expiresAt: pastDate,
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_INVALID");
  });

  it("clears the cookie on session-invalid (so browser stops sending stale token)", async () => {
    dbMock.rsvpSession.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody, { sessionCookie: "stale" }));
    expect(res.status).toBe(401);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/Max-Age=0/);
  });

  it("rejects the LOSER of a concurrent-submit race (consume returns count: 0)", async () => {
    // Setup: session lookup succeeds (the race window opened), but by the
    // time we conditionally consume, the WINNER already stamped usedAt.
    // The conditional updateMany returns count: 0 → SESSION_INVALID.
    dbMock.rsvpSession.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_INVALID");

    // Critical: the heavy work must NOT have run for the loser. No RSVP
    // upsert, no invite update, no email queue — the rollback unwinds the
    // partial work.
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
    expect(dbMock.invite.update).not.toHaveBeenCalled();
    expect(queueConfirmationEmailMock).not.toHaveBeenCalled();
  });

  it("uses a conditional updateMany (where usedAt: null) for consume", async () => {
    await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    const consumeCall = dbMock.rsvpSession.updateMany.mock.calls[0][0];
    expect(consumeCall.where.usedAt).toBeNull();
  });
});

describe("invite re-validation", () => {
  it("rejects when invite is REVOKED between verify and submit", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      status: "REVOKED",
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVITE_INVALID");
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("rejects when event is no longer PUBLISHED", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      event: { ...validInvite.event, status: "CANCELLED" },
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect((await res.json()).code).toBe("INVITE_INVALID");
  });

  it("rejects when rsvpDeadline has passed (DEADLINE_PASSED)", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      event: { ...validInvite.event, rsvpDeadline: pastDate },
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect((await res.json()).code).toBe("DEADLINE_PASSED");
  });

  it("rejects when event start has passed (EVENT_ENDED)", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      event: { ...validInvite.event, startAt: pastDate },
    });
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect((await res.json()).code).toBe("EVENT_ENDED");
  });
});

describe("party size", () => {
  it("rejects guestCount > 1 + plusOnesAllowed", async () => {
    const res = await POST(
      makeRequest(
        {
          ...validBody,
          guestCount: 5, // plus-ones allowed = 2 → max 3
          additionalGuestNames: ["b", "c", "d", "e"],
        },
        { sessionCookie: "tok" }
      )
    );
    expect((await res.json()).code).toBe("PARTY_SIZE_INVALID");
  });

  it("accepts guestCount up to 1 + plusOnesAllowed", async () => {
    const res = await POST(
      makeRequest(
        {
          ...validBody,
          guestCount: 3,
          additionalGuestNames: ["Bob", "Carol"],
        },
        { sessionCookie: "tok" }
      )
    );
    expect(res.status).toBe(200);
  });
});

describe("capacity", () => {
  it("rejects YES when capacity is full", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      event: { ...validInvite.event, maxAttendees: 10 },
    });
    // Lock query then count query.
    dbMock.$queryRaw
      .mockResolvedValueOnce([{ max_attendees: 10 }])
      .mockResolvedValueOnce([{ count: BigInt(10) }]);

    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect((await res.json()).code).toBe("CAPACITY_FULL");
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("does not run capacity check for NO", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      event: { ...validInvite.event, maxAttendees: 10 },
    });
    const res = await POST(
      makeRequest({ ...validBody, response: "NO" }, { sessionCookie: "tok" })
    );
    expect(res.status).toBe(200);
    expect(dbMock.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("email conflict", () => {
  it("rejects when provided email matches another non-revoked invite for the same event", async () => {
    dbMock.invite.findFirst.mockResolvedValue({ id: "inv_other" });
    const res = await POST(
      makeRequest(
        { ...validBody, guestEmail: "shared@example.com" },
        { sessionCookie: "tok" }
      )
    );
    expect((await res.json()).code).toBe("EMAIL_CONFLICT");
  });

  it("normalizes the provided email to lowercase before checking conflict", async () => {
    // Note: surrounding whitespace would fail Zod's .email() validator before
    // reaching the route's normalizer, so we pass already-trimmed input here.
    await POST(
      makeRequest(
        { ...validBody, guestEmail: "ALICE@EXAMPLE.COM" },
        { sessionCookie: "tok" }
      )
    );
    expect(dbMock.invite.findFirst.mock.calls[0][0].where.email).toBe(
      "alice@example.com"
    );
  });
});

describe("honeypot + malformed body", () => {
  it("rejects when honeypot is filled (no DB work)", async () => {
    const res = await POST(
      makeRequest({ ...validBody, hp: "i am bot" }, { sessionCookie: "tok" })
    );
    expect((await res.json()).code).toBe("INVALID");
    expect(dbMock.rsvpSession.findUnique).not.toHaveBeenCalled();
  });

  it("rejects malformed body with generic INVALID", async () => {
    const res = await POST(
      makeRequest({ guestName: "" /* empty */ }, { sessionCookie: "tok" })
    );
    expect((await res.json()).code).toBe("INVALID");
  });
});

describe("email curation + message moderation", () => {
  it("seeds invite.email when invite has no email and submit provides one", async () => {
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, email: null });
    await POST(
      makeRequest(
        { ...validBody, guestEmail: "new@example.com" },
        { sessionCookie: "tok" }
      )
    );
    const inviteUpdate = dbMock.invite.update.mock.calls[0][0];
    expect(inviteUpdate.data.email).toBe("new@example.com");
  });

  it("does not overwrite invite.email when one already exists", async () => {
    await POST(
      makeRequest(
        { ...validBody, guestEmail: "different@example.com" },
        { sessionCookie: "tok" }
      )
    );
    const inviteUpdate = dbMock.invite.update.mock.calls[0][0];
    expect(inviteUpdate.data.email).toBeUndefined();
  });

  it("preserves rsvpCodeUsedAt on re-RSVP (only stamps once)", async () => {
    const firstUse = new Date("2026-04-01");
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      rsvpCodeUsedAt: firstUse,
    });
    await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(dbMock.invite.update.mock.calls[0][0].data.rsvpCodeUsedAt).toBe(firstUse);
  });

  it("resets messageStatus when messageToHost text actually changes", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      rsvp: { messageToHost: "Old wish", messageStatus: "APPROVED" },
    });
    await POST(
      makeRequest(
        { ...validBody, messageToHost: "New wish" },
        { sessionCookie: "tok" }
      )
    );
    const update = dbMock.rSVP.upsert.mock.calls[0][0].update;
    expect(update.messageStatus).toBe("PENDING");
    expect(update.messageApprovedAt).toBeNull();
  });

  it("does NOT reset messageStatus when messageToHost is unchanged", async () => {
    dbMock.invite.findUnique.mockResolvedValue({
      ...validInvite,
      rsvp: { messageToHost: "Same wish", messageStatus: "APPROVED" },
    });
    await POST(
      makeRequest(
        { ...validBody, messageToHost: "Same wish" },
        { sessionCookie: "tok" }
      )
    );
    const update = dbMock.rSVP.upsert.mock.calls[0][0].update;
    expect(update.messageStatus).toBeUndefined();
  });
});

describe("confirmation email", () => {
  it("skips email queue when neither invite.email nor body.guestEmail are present", async () => {
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, email: null });
    await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(queueConfirmationEmailMock).not.toHaveBeenCalled();
  });

  it("sends confirmation to body.guestEmail when invite has no email", async () => {
    dbMock.invite.findUnique.mockResolvedValue({ ...validInvite, email: null });
    await POST(
      makeRequest(
        { ...validBody, guestEmail: "fresh@example.com" },
        { sessionCookie: "tok" }
      )
    );
    expect(queueConfirmationEmailMock.mock.calls[0][1]).toBe("fresh@example.com");
  });

  it("includes portalUrl + unsubscribeUrl built from a freshly-rotated token", async () => {
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(res.status).toBe(200);

    // The route mints a portal token, rotates Invite.tokenHash to its hash,
    // and embeds the raw token in both the email payload and the response
    // body so the confirmed page can deep-link with `?tk=`.
    const payload = queueConfirmationEmailMock.mock.calls[0][2];
    expect(payload.portalUrl).toMatch(
      /\/e\/alice-bob-wedding\?tk=[A-Za-z0-9_-]+$/
    );
    expect(payload.unsubscribeUrl).toMatch(/\/unsubscribe\/[A-Za-z0-9_-]+$/);

    // Same token comes back in the response so the client can forward it to
    // /e/[slug]/rsvp/confirmed?tk=...
    const body = await res.json();
    expect(typeof body.data.portalToken).toBe("string");
    expect(body.data.portalToken.length).toBeGreaterThan(0);

    // Invite.tokenHash gets rotated as part of the same update that marks
    // the invite RESPONDED. The hash in the DB matches the raw portalToken.
    const inviteUpdate = dbMock.invite.update.mock.calls[0][0];
    expect(typeof inviteUpdate.data.tokenHash).toBe("string");
    expect(inviteUpdate.data.tokenHash).toHaveLength(64); // sha256 hex
  });

  it("rotates Invite.tokenHash to hashToken(response.portalToken) — body and DB agree", async () => {
    // Regression guard: if the route ever hashes a different value than the
    // one it returns, the email's portal link would 404 because the DB hash
    // wouldn't match the raw token. Verify they're consistent.
    const { hashToken } = await import("@/lib/tokens");
    const res = await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    const body = await res.json();
    const inviteUpdate = dbMock.invite.update.mock.calls[0][0];
    expect(hashToken(body.data.portalToken)).toBe(inviteUpdate.data.tokenHash);

    // The email payload's portalUrl embeds the same raw token.
    const payload = queueConfirmationEmailMock.mock.calls[0][2];
    expect(payload.portalUrl).toContain(`tk=${body.data.portalToken}`);
    expect(payload.unsubscribeUrl).toContain(body.data.portalToken);
  });

  it("schedules post-response email delivery outside the transaction", async () => {
    await POST(makeRequest(validBody, { sessionCookie: "tok" }));
    expect(scheduleEmailProcessingMock).toHaveBeenCalledWith("email-1");
  });
});
