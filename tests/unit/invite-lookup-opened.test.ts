import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Only the DB is mocked — hashToken / response helpers are pure and run for real.
const dbMock = {
  invite: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { GET } = await import("@/app/api/invites/lookup/route");

function lookup(token: string): NextRequest {
  return new NextRequest(
    `https://example.com/api/invites/lookup?token=${token}`,
  );
}

// Minimal invite shape the lookup route reads/returns. `event.status` must not
// be CANCELLED; expiresAt null; rsvp null.
function inviteWithStatus(status: string) {
  return {
    id: "inv_1",
    email: null,
    phone: "+14155551234",
    name: "Jane",
    status,
    plusOnesAllowed: 0,
    expiresAt: null,
    event: {
      id: "evt_1",
      title: "Wedding",
      slug: "wedding",
      status: "PUBLISHED",
      creator: { name: "Host" },
      organization: null,
      _count: { rsvps: 0 },
    },
    rsvp: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.invite.update.mockResolvedValue({});
});

describe("GET /api/invites/lookup — DRAFTED advances to OPENED on link click", () => {
  it("marks a DRAFTED (phone-only shared) invite as OPENED when the guest visits", async () => {
    dbMock.invite.findUnique.mockResolvedValue(inviteWithStatus("DRAFTED"));

    const res = await GET(lookup("rawtoken123"));
    expect(res.status).toBe(200);

    const openedCall = dbMock.invite.update.mock.calls.find(
      (c) => c[0]?.data?.status === "OPENED",
    );
    expect(openedCall).toBeTruthy();
    expect(openedCall![0].data.openedAt).toBeInstanceOf(Date);
  });

  it("does not re-open an already RESPONDED invite", async () => {
    dbMock.invite.findUnique.mockResolvedValue(inviteWithStatus("RESPONDED"));

    const res = await GET(lookup("rawtoken123"));
    expect(res.status).toBe(200);

    const openedCall = dbMock.invite.update.mock.calls.find(
      (c) => c[0]?.data?.status === "OPENED",
    );
    expect(openedCall).toBeFalsy();
  });
});
