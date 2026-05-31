import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Only the DB is mocked — hashToken + the markInviteOpenedIfUnopened helper run
// for real (the helper writes via the mocked db).
const dbMock = {
  invite: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { POST } = await import("@/app/api/invites/opened/route");

function beacon(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/invites/opened", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.invite.update.mockResolvedValue({});
});

describe("POST /api/invites/opened — client OPENED beacon", () => {
  it("advances a DRAFTED invite to OPENED", async () => {
    dbMock.invite.findUnique.mockResolvedValue({ id: "inv_1", status: "DRAFTED" });

    const res = await POST(beacon({ token: "rawtoken" }));
    expect(res.status).toBe(204);

    const openedCall = dbMock.invite.update.mock.calls.find(
      (c) => c[0]?.data?.status === "OPENED",
    );
    expect(openedCall).toBeTruthy();
    expect(openedCall![0].data.openedAt).toBeInstanceOf(Date);
  });

  it("is a no-op for an already RESPONDED invite", async () => {
    dbMock.invite.findUnique.mockResolvedValue({ id: "inv_1", status: "RESPONDED" });

    const res = await POST(beacon({ token: "rawtoken" }));
    expect(res.status).toBe(204);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns 400 when the token is missing (no DB read)", async () => {
    const res = await POST(beacon({}));
    expect(res.status).toBe(400);
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
  });

  it("returns 204 without leaking validity when the token matches no invite", async () => {
    dbMock.invite.findUnique.mockResolvedValue(null);

    const res = await POST(beacon({ token: "bogus" }));
    expect(res.status).toBe(204);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });
});
