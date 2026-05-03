import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.RSVP_CODE_HMAC_KEY =
    "test-pepper-with-at-least-32-characters-padding";
});

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
  "@/app/api/events/[id]/invites/[inviteId]/rsvp-code/regenerate/route"
);

function makeRequest(): NextRequest {
  return new NextRequest(
    "https://example.com/api/events/evt_1/invites/inv_1/rsvp-code/regenerate",
    { method: "POST" }
  );
}

const mockUser = { id: "user_1", status: "ACTIVE" };
const ctx = {
  params: Promise.resolve({ id: "evt_1", inviteId: "inv_1" }),
};

const validInvite = {
  id: "inv_1",
  eventId: "evt_1",
  status: "PENDING",
  rsvpCodeRegenerateCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);
  dbMock.invite.findUnique.mockResolvedValue(validInvite);
  dbMock.invite.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({
      id: "inv_1",
      rsvpCodeRegenerateCount:
        (data.rsvpCodeRegenerateCount as { increment: number })?.increment ===
        undefined
          ? 1
          : 1,
    })
  );
});

describe("POST /api/events/[id]/invites/[inviteId]/rsvp-code/regenerate", () => {
  it("returns the raw new code on success", async () => {
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.rsvpCode).toMatch(/^EVG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(body.data.regenerationsRemaining).toBe(2);
  });

  it("persists the hash, stamps issuedAt, resets usedAt, increments counter", async () => {
    await POST(makeRequest(), ctx);
    const updateCall = dbMock.invite.update.mock.calls[0][0];
    expect(updateCall.where.id).toBe("inv_1");
    expect(updateCall.data.rsvpCodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(updateCall.data.rsvpCodeIssuedAt).toBeInstanceOf(Date);
    expect(updateCall.data.rsvpCodeUsedAt).toBeNull();
    expect(updateCall.data.rsvpCodeRegenerateCount).toEqual({ increment: 1 });
  });

  it("returns 401 when not authenticated", async () => {
    verifyAuthMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(401);
    expect(dbMock.invite.findUnique).not.toHaveBeenCalled();
  });

  it("checks event ownership", async () => {
    await POST(makeRequest(), ctx);
    expect(requireEventOwnerMock).toHaveBeenCalledWith("evt_1", "user_1");
  });

  it("returns 404 when invite is missing", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 when invite belongs to a different event", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...validInvite,
      eventId: "different-event",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects regeneration on a REVOKED invite", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...validInvite,
      status: "REVOKED",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/revoked/i);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("rejects regeneration on an EXPIRED invite", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...validInvite,
      status: "EXPIRED",
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expired/i);
  });

  it("rejects when regeneration cap (3) is already reached", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...validInvite,
      rsvpCodeRegenerateCount: 3,
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/limit reached/i);
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("allows the 3rd regeneration (count: 2) but reports 0 remaining", async () => {
    dbMock.invite.findUnique.mockResolvedValueOnce({
      ...validInvite,
      rsvpCodeRegenerateCount: 2,
    });
    dbMock.invite.update.mockResolvedValueOnce({
      id: "inv_1",
      rsvpCodeRegenerateCount: 3,
    });
    const res = await POST(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.regenerationsRemaining).toBe(0);
  });
});
