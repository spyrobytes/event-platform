import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db: only the methods the endpoints touch. $transaction is driven per-test.
const dbMock = {
  user: { findUnique: vi.fn() },
  impersonationGrant: { findUnique: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const requireAdminMock = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: requireAdminMock }));

const verifyEventOwnershipMock = vi.fn();
vi.mock("@/lib/authorization", () => ({
  verifyEventOwnership: verifyEventOwnershipMock,
  // imported (module-level) by impersonation.ts but never called in these tests
  assertCanMutate: vi.fn(),
}));

// impersonation.ts imports verifyAuth at module load; requireAdmin is mocked so
// it's never actually invoked here.
vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));

const { POST, DELETE, GET } = await import(
  "@/app/api/admin/impersonation/route"
);

const admin = { id: "admin_1", email: "admin@eventfxr.com", isAdmin: true };
const organizer = {
  id: "org_1",
  isAdmin: false,
  status: "ACTIVE",
  email: "o@x.com",
  name: "Org Anizer",
};

function postReq(body: unknown): NextRequest {
  return new NextRequest("https://x.com/api/admin/impersonation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function deleteReq(grantId?: string): NextRequest {
  const url = grantId
    ? `https://x.com/api/admin/impersonation?grantId=${grantId}`
    : "https://x.com/api/admin/impersonation";
  return new NextRequest(url, { method: "DELETE" });
}

const validBody = { targetUserId: "org_1", eventId: "evt_1", reason: "fix hero" };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin); // admin by default
});

describe("POST /api/admin/impersonation (start)", () => {
  it("returns the admin-gate Response when not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(403);
    expect(dbMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("400s on an invalid body (reason too short)", async () => {
    const res = await POST(postReq({ ...validBody, reason: "x" }));
    expect(res.status).toBe(400);
  });

  it("400s when acting as yourself", async () => {
    const res = await POST(postReq({ ...validBody, targetUserId: admin.id }));
    expect(res.status).toBe(400);
  });

  it("404s when the target is not found", async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(404);
  });

  it.each([
    ["another admin", { ...organizer, isAdmin: true }],
    ["a banned organizer", { ...organizer, status: "BANNED" }],
    ["a suspended organizer", { ...organizer, status: "SUSPENDED" }],
  ])("403s when the target is %s", async (_label, target) => {
    dbMock.user.findUnique.mockResolvedValue(target);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(403);
    expect(verifyEventOwnershipMock).not.toHaveBeenCalled();
  });

  it("403s when the target does not own the event", async () => {
    dbMock.user.findUnique.mockResolvedValue(organizer);
    verifyEventOwnershipMock.mockResolvedValue(false);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(403);
  });

  it("creates the grant + start audit atomically and returns 201", async () => {
    dbMock.user.findUnique.mockResolvedValue(organizer);
    verifyEventOwnershipMock.mockResolvedValue(true);

    const created = { id: "grant_1", expiresAt: new Date(Date.now() + 60_000) };
    const txGrantCreate = vi.fn().mockResolvedValue(created);
    const txAuditCreate = vi.fn();
    dbMock.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        impersonationGrant: { create: txGrantCreate },
        adminAuditLog: { create: txAuditCreate },
      }),
    );

    const res = await POST(postReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.grantId).toBe("grant_1");
    expect(json.data.target).toMatchObject({ id: "org_1" });
    // grant + audit committed together
    expect(txGrantCreate).toHaveBeenCalledTimes(1);
    expect(txAuditCreate).toHaveBeenCalledTimes(1);
    expect(txAuditCreate.mock.calls[0][0].data).toMatchObject({
      actorUserId: "admin_1",
      action: "impersonation.start",
      targetUserId: "org_1",
      grantId: "grant_1",
    });
  });
});

describe("DELETE /api/admin/impersonation (exit)", () => {
  it("400s without a grantId", async () => {
    const res = await DELETE(deleteReq());
    expect(res.status).toBe(400);
  });

  it("404s for a missing grant", async () => {
    dbMock.impersonationGrant.findUnique.mockResolvedValue(null);
    const res = await DELETE(deleteReq("grant_1"));
    expect(res.status).toBe(404);
  });

  it("404s for another admin's grant (no leak)", async () => {
    dbMock.impersonationGrant.findUnique.mockResolvedValue({
      id: "grant_1",
      adminUserId: "someone_else",
      targetUserId: "org_1",
      eventId: "evt_1",
      endedAt: null,
    });
    const res = await DELETE(deleteReq("grant_1"));
    expect(res.status).toBe(404);
  });

  it("ends an active grant and writes one END audit row", async () => {
    dbMock.impersonationGrant.findUnique.mockResolvedValue({
      id: "grant_1",
      adminUserId: "admin_1",
      targetUserId: "org_1",
      eventId: "evt_1",
      endedAt: null,
    });
    const txAuditCreate = vi.fn();
    dbMock.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        impersonationGrant: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        adminAuditLog: { create: txAuditCreate },
      }),
    );

    const res = await DELETE(deleteReq("grant_1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { ended: true, alreadyEnded: false },
    });
    expect(txAuditCreate).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a concurrent/duplicate exit (count 0) writes NO second audit", async () => {
    dbMock.impersonationGrant.findUnique.mockResolvedValue({
      id: "grant_1",
      adminUserId: "admin_1",
      targetUserId: "org_1",
      eventId: "evt_1",
      endedAt: null,
    });
    const txAuditCreate = vi.fn();
    dbMock.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        impersonationGrant: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        adminAuditLog: { create: txAuditCreate },
      }),
    );

    const res = await DELETE(deleteReq("grant_1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { ended: true, alreadyEnded: true },
    });
    expect(txAuditCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/impersonation (active grants)", () => {
  it("returns the admin's active grants, scoped by the shared active-where", async () => {
    dbMock.impersonationGrant.findMany.mockResolvedValue([
      { id: "grant_1", targetUserId: "org_1", eventId: "evt_1" },
    ]);
    const res = await GET(
      new NextRequest("https://x.com/api/admin/impersonation"),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.grants).toHaveLength(1);

    const where = dbMock.impersonationGrant.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ adminUserId: "admin_1", endedAt: null });
    expect(where.expiresAt).toHaveProperty("gt");
  });
});
