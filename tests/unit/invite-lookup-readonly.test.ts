import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression guard for #148: GET /api/invites/lookup must be read-only — it
// must NOT advance status to OPENED or write EXPIRED on a plain server-render
// GET (a crawler/prefetch could otherwise drive state transitions). OPENED is
// now recorded only by the client beacon (POST /api/invites/opened).
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

function inviteWithStatus(status: string, extra: Record<string, unknown> = {}) {
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
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.invite.update.mockResolvedValue({});
});

describe("GET /api/invites/lookup — read-only (no status mutation, #148)", () => {
  it("does NOT mark a DRAFTED invite OPENED", async () => {
    dbMock.invite.findUnique.mockResolvedValue(inviteWithStatus("DRAFTED"));
    const res = await GET(lookup("rawtoken"));
    expect(res.status).toBe(200);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("does NOT write EXPIRED for a past-expiry invite (still returns not-found)", async () => {
    const past = new Date(Date.UTC(2000, 0, 1));
    dbMock.invite.findUnique.mockResolvedValue(
      inviteWithStatus("SENT", { expiresAt: past }),
    );
    const res = await GET(lookup("rawtoken"));
    expect(res.status).toBe(404);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });
});
