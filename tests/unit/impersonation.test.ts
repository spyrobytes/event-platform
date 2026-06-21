import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

const grantFindUnique = vi.fn();
const userFindUnique = vi.fn();
const auditCreate = vi.fn();
const dbMock = {
  impersonationGrant: { findUnique: grantFindUnique },
  user: { findUnique: userFindUnique },
  adminAuditLog: { create: auditCreate },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const {
  resolveEffectiveUser,
  requireEffectiveMutator,
  auditImpersonatedEdit,
  ACT_AS_HEADER,
  ImpersonationError,
} = await import("@/lib/impersonation");

function req(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

const admin = { id: "admin_1", isAdmin: true, email: "a@x.com", status: "ACTIVE" };
const organizer = { id: "org_1", isAdmin: false, email: "o@x.com", status: "ACTIVE" };

function validGrant(over: Record<string, unknown> = {}) {
  return {
    id: "grant_1",
    adminUserId: "admin_1",
    targetUserId: "org_1",
    eventId: "evt_1",
    reason: "help",
    endedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...over,
  };
}

describe("resolveEffectiveUser", () => {
  beforeEach(() => {
    verifyAuthMock.mockReset();
    grantFindUnique.mockReset();
    userFindUnique.mockReset();
  });

  it("returns null when unauthenticated", async () => {
    verifyAuthMock.mockResolvedValue(null);
    expect(await resolveEffectiveUser(req(), "evt_1")).toBeNull();
  });

  it("no act-as header → actor is the effective user, not impersonating", async () => {
    verifyAuthMock.mockResolvedValue(organizer);
    const ctx = await resolveEffectiveUser(req(), "evt_1");
    expect(ctx).toEqual({
      actor: organizer,
      effective: organizer,
      grant: null,
      impersonating: false,
    });
    expect(grantFindUnique).not.toHaveBeenCalled();
  });

  it("valid grant → effective is the target organizer, actor stays the admin", async () => {
    verifyAuthMock.mockResolvedValue(admin);
    grantFindUnique.mockResolvedValue(validGrant());
    userFindUnique.mockResolvedValue(organizer);

    const ctx = await resolveEffectiveUser(req({ [ACT_AS_HEADER]: "grant_1" }), "evt_1");
    expect(ctx?.impersonating).toBe(true);
    expect(ctx?.actor).toBe(admin);
    expect(ctx?.effective).toBe(organizer);
    expect(ctx?.grant?.id).toBe("grant_1");
  });

  it("rejects a non-admin who sends the header (hard 403, no fallback)", async () => {
    verifyAuthMock.mockResolvedValue(organizer); // not admin
    await expect(
      resolveEffectiveUser(req({ [ACT_AS_HEADER]: "grant_1" }), "evt_1"),
    ).rejects.toBeInstanceOf(ImpersonationError);
    expect(grantFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["grant not found", () => grantFindUnique.mockResolvedValue(null)],
    ["foreign admin", () => grantFindUnique.mockResolvedValue(validGrant({ adminUserId: "other" }))],
    ["different event", () => grantFindUnique.mockResolvedValue(validGrant({ eventId: "evt_OTHER" }))],
    ["already ended", () => grantFindUnique.mockResolvedValue(validGrant({ endedAt: new Date() }))],
    ["expired", () => grantFindUnique.mockResolvedValue(validGrant({ expiresAt: new Date(Date.now() - 1000) }))],
  ])("rejects an invalid grant: %s", async (_label, arrange) => {
    verifyAuthMock.mockResolvedValue(admin);
    arrange();
    await expect(
      resolveEffectiveUser(req({ [ACT_AS_HEADER]: "grant_1" }), "evt_1"),
    ).rejects.toBeInstanceOf(ImpersonationError);
  });

  it.each([
    ["missing", null],
    ["banned", { ...organizer, status: "BANNED" }],
  ])("rejects when the target organizer is %s", async (_label, target) => {
    verifyAuthMock.mockResolvedValue(admin);
    grantFindUnique.mockResolvedValue(validGrant());
    userFindUnique.mockResolvedValue(target);
    await expect(
      resolveEffectiveUser(req({ [ACT_AS_HEADER]: "grant_1" }), "evt_1"),
    ).rejects.toBeInstanceOf(ImpersonationError);
  });
});

describe("auditImpersonatedEdit", () => {
  beforeEach(() => auditCreate.mockReset());

  it("no-ops when not impersonating (no grant)", async () => {
    await auditImpersonatedEdit(
      { actor: admin, effective: admin, grant: null, impersonating: false } as never,
      req(),
      "evt_1",
      { route: "page-config.PUT" },
    );
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("writes an IMPERSONATION_EDIT row when acting-as", async () => {
    await auditImpersonatedEdit(
      {
        actor: admin,
        effective: organizer,
        grant: validGrant(),
        impersonating: true,
      } as never,
      req({ "user-agent": "jest" }),
      "evt_1",
      { route: "page-config.PUT", templateChanged: true },
    );
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const data = auditCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      actorUserId: "admin_1",
      action: "impersonation.edit",
      targetUserId: "org_1",
      eventId: "evt_1",
      grantId: "grant_1",
    });
  });
});

describe("requireEffectiveMutator", () => {
  beforeEach(() => {
    verifyAuthMock.mockReset();
  });

  it("returns a 401 Response when unauthenticated", async () => {
    verifyAuthMock.mockResolvedValue(null);
    const r = await requireEffectiveMutator(req(), "evt_1");
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(401);
  });

  it("returns the context for an active, non-suspended user", async () => {
    verifyAuthMock.mockResolvedValue(organizer);
    const r = await requireEffectiveMutator(req(), "evt_1");
    expect(r).not.toBeInstanceOf(Response);
    expect((r as { effective: typeof organizer }).effective).toBe(organizer);
  });

  it("throws a 403 when the effective user is SUSPENDED", async () => {
    verifyAuthMock.mockResolvedValue({ ...organizer, status: "SUSPENDED" });
    await expect(requireEffectiveMutator(req(), "evt_1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
