import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
const dbMock = { adminAuditLog: { create: createMock } };
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { recordAdminAudit, ADMIN_AUDIT_ACTION } = await import("@/lib/audit");

describe("recordAdminAudit", () => {
  beforeEach(() => createMock.mockReset());

  it("writes a row and null-coalesces all optional fields", async () => {
    await recordAdminAudit({
      actorUserId: "admin_1",
      action: ADMIN_AUDIT_ACTION.IMPERSONATION_START,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin_1",
        actorEmail: null,
        action: "impersonation.start",
        targetUserId: null,
        eventId: null,
        grantId: null,
        ip: null,
        userAgent: null,
      },
    });
    // `detail` must be omitted (not null) when not provided, so the column
    // stays NULL without tripping Prisma's JsonNull typing.
    expect(createMock.mock.calls[0][0].data).not.toHaveProperty("detail");
  });

  it("passes through ids and includes detail only when provided", async () => {
    await recordAdminAudit({
      actorUserId: "admin_1",
      actorEmail: "admin@eventfxr.com",
      action: ADMIN_AUDIT_ACTION.IMPERSONATION_EDIT,
      targetUserId: "org_9",
      eventId: "evt_3",
      grantId: "grant_7",
      detail: { route: "page-config", changed: ["templateId"] },
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorUserId: "admin_1",
        actorEmail: "admin@eventfxr.com",
        action: "impersonation.edit",
        targetUserId: "org_9",
        eventId: "evt_3",
        grantId: "grant_7",
        ip: null,
        userAgent: null,
        detail: { route: "page-config", changed: ["templateId"] },
      },
    });
  });

  it("propagates write failures — audit is not best-effort", async () => {
    createMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      recordAdminAudit({ actorUserId: "admin_1", action: "x" }),
    ).rejects.toThrow("db down");
  });
});
