import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AccountSuspendedError, ForbiddenError } from "@/lib/errors";

const dbMock = {
  invite: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

const requireEventOwnerMock = vi.fn();
const assertCanMutateMock = vi.fn();
vi.mock("@/lib/authorization", () => ({
  requireEventOwner: requireEventOwnerMock,
  assertCanMutate: assertCanMutateMock,
}));

const { POST } = await import(
  "@/app/api/events/[id]/invites/[inviteId]/mark-shared/route"
);

function makeRequest(): NextRequest {
  return new NextRequest(
    "https://example.com/api/events/evt_1/invites/inv_1/mark-shared",
    { method: "POST" }
  );
}

const mockUser = { id: "user_1", status: "ACTIVE" };
const ctx = { params: Promise.resolve({ id: "evt_1", inviteId: "inv_1" }) };

const pendingInvite = {
  id: "inv_1",
  eventId: "evt_1",
  status: "PENDING",
  sentAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);
  dbMock.invite.findUnique.mockResolvedValue(pendingInvite);
  dbMock.invite.update.mockResolvedValue({
    id: "inv_1",
    status: "DRAFTED",
  });
});

describe("POST /api/events/[id]/invites/[inviteId]/mark-shared", () => {
  it("advances a PENDING invite to DRAFTED (not SENT) and does NOT stamp sentAt", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("DRAFTED");
    expect(body.data.changed).toBe(true);

    const updateCall = dbMock.invite.update.mock.calls[0][0];
    expect(updateCall.where.id).toBe("inv_1");
    expect(updateCall.data.status).toBe("DRAFTED");
    // Nothing was actually sent — sentAt must not be set.
    expect(updateCall.data.sentAt).toBeUndefined();
  });

  it("is a no-op (changed:false) when already DRAFTED — does not write", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...pendingInvite,
      status: "DRAFTED",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(false);
    expect(body.data.status).toBe("DRAFTED");
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("does not regress a RESPONDED invite", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...pendingInvite,
      status: "RESPONDED",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.changed).toBe(false);
    expect(body.data.status).toBe("RESPONDED");
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated (no DB read)", async () => {
    verifyAuthMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(401);
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
  });

  it("checks event ownership", async () => {
    await POST(makeRequest(), ctx);
    expect(requireEventOwnerMock).toHaveBeenCalledWith("evt_1", "user_1");
  });

  it("returns 404 when the invite is missing", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(404);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the invite belongs to a different event", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...pendingInvite,
      eventId: "other-event",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(404);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("invokes the mutate-permission guard", async () => {
    await POST(makeRequest(), ctx);
    expect(assertCanMutateMock).toHaveBeenCalled();
  });

  it("returns 403 and does not write when the account cannot mutate (suspended)", async () => {
    assertCanMutateMock.mockImplementationOnce(() => {
      throw new AccountSuspendedError();
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(403);
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns 403 and does not write when the user is not the event owner", async () => {
    requireEventOwnerMock.mockRejectedValueOnce(
      new ForbiddenError("You don't have permission to access this event")
    );
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(403);
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });
});
