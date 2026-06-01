import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = "https://eventfxr.test";
});

// DB layer — the invite-token RSVP route touches invite.findUnique,
// rSVP.upsert, invite.update, $queryRaw (capacity), and $transaction.
const dbMock = {
  invite: { findUnique: vi.fn(), update: vi.fn() },
  rSVP: { upsert: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (fn) => fn(dbMock)),
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

// Email module — verify the route enqueues + schedules; the actual send is
// deferred. buildUnsubscribeUrl is a pure formatter, kept pure here.
type QueueConfirmationEmail = typeof import("@/lib/email").queueConfirmationEmail;
type ScheduleEmailProcessing = typeof import("@/lib/email").scheduleEmailProcessing;
const queueConfirmationEmailMock = vi.fn<QueueConfirmationEmail>(
  async () => "email-1"
);
const scheduleEmailProcessingMock = vi.fn<ScheduleEmailProcessing>(() => {});
vi.mock("@/lib/email", () => ({
  queueConfirmationEmail: queueConfirmationEmailMock,
  scheduleEmailProcessing: scheduleEmailProcessingMock,
  buildUnsubscribeUrl: (rawToken: string) =>
    `https://eventfxr.test/unsubscribe/${rawToken}`,
}));

const { POST } = await import("@/app/api/rsvp/route");

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDate = new Date(Date.now() - 1000);

// Base invite: has an email, attending allowance of 3, no prior RSVP, an
// event with no capacity cap (capacity block is skipped unless overridden).
function makeInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_1",
    eventId: "evt_1",
    email: "alice@example.com",
    phone: null,
    name: "Alice",
    plusOnesAllowed: 3,
    passId: "pass_1",
    status: "PENDING",
    expiresAt: null,
    rsvp: null,
    ...overrides,
    event: {
      id: "evt_1",
      title: "Wedding",
      slug: "alice-bob-wedding",
      status: "PUBLISHED",
      maxAttendees: null,
      rsvpDeadline: futureDate,
      ...(overrides.event as Record<string, unknown> | undefined),
    },
  };
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("https://eventfxr.test/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Valid body for the default (email-present) invite. `guestEmail: ""` mirrors
// the form, which always registers the field; the schema transforms "" to
// undefined so it reads as "no email provided".
const validBody = {
  token: "raw-token",
  guestName: "Alice",
  response: "YES" as const,
  guestCount: 1,
  guestEmail: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.invite.findUnique.mockResolvedValue(makeInvite());
  dbMock.invite.update.mockResolvedValue({});
  dbMock.rSVP.upsert.mockImplementation(
    ({ create }: { create: Record<string, unknown> }) =>
      Promise.resolve({
        id: "rsvp_1",
        response: create.response,
        guestName: create.guestName,
        guestCount: create.guestCount,
        additionalGuestNames: create.additionalGuestNames,
        respondedAt: new Date(),
      })
  );
  // Default capacity query stubs (only consulted when maxAttendees is set).
  dbMock.$queryRaw.mockResolvedValue([{ max_attendees: null }]);
  dbMock.$transaction.mockImplementation(async (fn) => fn(dbMock));
});

describe("POST /api/rsvp — happy path", () => {
  it("YES upserts the RSVP, marks invite RESPONDED, queues + schedules the email", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.rsvp.response).toBe("YES");
    expect(body.data.event).toEqual({
      id: "evt_1",
      title: "Wedding",
      slug: "alice-bob-wedding",
    });

    // Invite advanced to RESPONDED (first invite.update, inside the tx).
    expect(dbMock.invite.update.mock.calls[0][0].data.status).toBe("RESPONDED");

    // Confirmation queued to the invite's email, then scheduled post-commit.
    expect(queueConfirmationEmailMock).toHaveBeenCalledTimes(1);
    expect(queueConfirmationEmailMock.mock.calls[0][1]).toBe("alice@example.com");
    expect(scheduleEmailProcessingMock).toHaveBeenCalledWith("email-1");
  });
});

describe("POST /api/rsvp — request guards", () => {
  it("rejects when neither token nor inviteToken is present (no DB work)", async () => {
    const res = await POST(
      makeRequest({ guestName: "Alice", response: "YES", guestEmail: "" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
  });

  it("404s when the invite token resolves to nothing", async () => {
    dbMock.invite.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("rejects a revoked invite", async () => {
    dbMock.invite.findUnique.mockResolvedValue(makeInvite({ status: "REVOKED" }));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("rejects once the RSVP deadline has passed", async () => {
    dbMock.invite.findUnique.mockResolvedValue(
      makeInvite({ event: { rsvpDeadline: pastDate } })
    );
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/deadline/i);
  });
});

describe("POST /api/rsvp — capacity counts seats, not rows", () => {
  // Each test sets a cap of 10 and stubs the two raw queries the capacity
  // block runs: the FOR UPDATE lock, then the seat SUM.
  function capacityInvite(overrides: Record<string, unknown> = {}) {
    return makeInvite({ event: { maxAttendees: 10 }, ...overrides });
  }
  function stubSeats(takenSeats: number) {
    dbMock.$queryRaw
      .mockResolvedValueOnce([{ max_attendees: 10 }])
      .mockResolvedValueOnce([{ seats: BigInt(takenSeats) }]);
  }

  it("rejects a new party whose seats push the SUM over capacity (plus-ones overbook guard)", async () => {
    // 9 seats already taken (could be 4 rows with plus-ones); a party of 3
    // makes 12 > 10. The old COUNT(*)-of-rows logic would have seen e.g.
    // 4 rows + 3 = 7 and wrongly allowed it.
    dbMock.invite.findUnique.mockResolvedValue(capacityInvite());
    stubSeats(9);
    const res = await POST(
      makeRequest({
        ...validBody,
        guestCount: 3,
        additionalGuestNames: ["Bob", "Carol"],
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/capacity/i);
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("accepts a party that exactly fills the remaining seats", async () => {
    dbMock.invite.findUnique.mockResolvedValue(capacityInvite());
    stubSeats(7); // 7 + 3 = 10 == max
    const res = await POST(
      makeRequest({
        ...validBody,
        guestCount: 3,
        additionalGuestNames: ["Bob", "Carol"],
      })
    );
    expect(res.status).toBe(200);
    expect(dbMock.rSVP.upsert).toHaveBeenCalled();
  });

  it("counts only OTHER invites' seats + the new party (this invite's row is excluded)", async () => {
    // The seat SUM excludes this invite's own row (invite_id IS DISTINCT FROM),
    // so the mock value is OTHER invites' seats: 8. Re-submitting a party of 2 →
    // 8 + 2 = 10 ≤ 10, and the invite's prior seats never double-count.
    dbMock.invite.findUnique.mockResolvedValue(
      capacityInvite({ rsvp: { response: "YES", guestCount: 2 } })
    );
    stubSeats(8);
    const res = await POST(
      makeRequest({ ...validBody, guestCount: 2, additionalGuestNames: ["Bob"] })
    );
    expect(res.status).toBe(200);
  });

  it("rejects bumping an existing YES party beyond capacity", async () => {
    dbMock.invite.findUnique.mockResolvedValue(
      capacityInvite({ rsvp: { response: "YES", guestCount: 2 } })
    );
    stubSeats(8); // 8 other seats + new party of 3 = 11 > 10
    const res = await POST(
      makeRequest({
        ...validBody,
        guestCount: 3,
        additionalGuestNames: ["Bob", "Carol"],
      })
    );
    expect(res.status).toBe(400);
  });

  it("does not credit a prior non-YES response toward the new party (NO→YES adds in full)", async () => {
    // 10 seats held by others; this invite (currently NO) switches to YES with a
    // party of 1 → 10 + 1 = 11 > 10. Its own row is excluded from the count
    // regardless of prior response, so nothing is wrongly credited back.
    dbMock.invite.findUnique.mockResolvedValue(
      capacityInvite({ rsvp: { response: "NO", guestCount: 1 } })
    );
    stubSeats(10);
    const res = await POST(makeRequest({ ...validBody, guestCount: 1 }));
    expect(res.status).toBe(400);
  });

  it("skips the capacity query entirely for a NO response", async () => {
    dbMock.invite.findUnique.mockResolvedValue(capacityInvite());
    const res = await POST(makeRequest({ ...validBody, response: "NO" }));
    expect(res.status).toBe(200);
    expect(dbMock.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("POST /api/rsvp — phone-only invites", () => {
  it("requires a guest email when the invite has none on file", async () => {
    dbMock.invite.findUnique.mockResolvedValue(makeInvite({ email: null }));
    const res = await POST(makeRequest({ ...validBody, guestEmail: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/provide an email/i);
    expect(dbMock.rSVP.upsert).not.toHaveBeenCalled();
  });

  it("curates the guest-provided email (lowercased) onto a phone-only invite", async () => {
    dbMock.invite.findUnique.mockResolvedValue(makeInvite({ email: null }));
    const res = await POST(
      makeRequest({ ...validBody, guestEmail: "New@Example.com" })
    );
    expect(res.status).toBe(200);
    // First update = RESPONDED (in tx); second = post-commit email curation.
    const curationUpdate = dbMock.invite.update.mock.calls[1][0];
    expect(curationUpdate.data.email).toBe("new@example.com");
  });

  it("survives a P2002 collision while curating the email — the RSVP still commits", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    dbMock.invite.findUnique.mockResolvedValue(makeInvite({ email: null }));
    dbMock.invite.update
      .mockResolvedValueOnce({}) // RESPONDED, inside the tx
      .mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint"), { code: "P2002" })
      ); // curation collides with another active invite's email

    const res = await POST(
      makeRequest({ ...validBody, guestEmail: "dupe@example.com" })
    );

    // RSVP + confirmation already landed; the swallowed collision must not
    // surface as an error to the guest.
    expect(res.status).toBe(200);
    expect(dbMock.rSVP.upsert).toHaveBeenCalled();
    expect(queueConfirmationEmailMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
