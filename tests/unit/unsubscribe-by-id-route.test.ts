import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  // signInviteUnsubscribe reads RSVP_CODE_HMAC_KEY at call time. Tests run
  // with NODE_ENV=test so the env proxy reads process.env directly — set
  // the key first.
  process.env.RSVP_CODE_HMAC_KEY = "a".repeat(48);
});

const dbMock = {
  invite: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { POST } = await import(
  "@/app/api/invites/unsubscribe-by-id/route"
);
const { signInviteUnsubscribe } = await import(
  "@/lib/invite-unsubscribe-signature"
);

const URL_STR =
  "https://example.com/api/invites/unsubscribe-by-id";

const makeRequest = (body: unknown) =>
  new NextRequest(URL_STR, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/invites/unsubscribe-by-id", () => {
  it("unsubscribes a valid (sig, invite) pair and returns the success message", async () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    dbMock.invite.findFirst.mockResolvedValueOnce({
      id: "inv_1",
      unsubscribedAt: null,
      event: { title: "Summer Wedding" },
    });
    dbMock.invite.update.mockResolvedValueOnce({});

    const res = await POST(
      makeRequest({ inviteId: "inv_1", eventId: "evt_1", sig }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("Summer Wedding");
    expect(dbMock.invite.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { unsubscribedAt: expect.any(Date) },
    });
    // Lookup is bound to BOTH ids — protects against cross-event replay.
    expect(dbMock.invite.findFirst).toHaveBeenCalledWith({
      where: { id: "inv_1", eventId: "evt_1" },
      select: expect.any(Object),
    });
  });

  it("is idempotent — already-unsubscribed returns success without a DB write", async () => {
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    dbMock.invite.findFirst.mockResolvedValueOnce({
      id: "inv_1",
      unsubscribedAt: new Date("2026-05-01T00:00:00Z"),
      event: { title: "Summer Wedding" },
    });

    const res = await POST(
      makeRequest({ inviteId: "inv_1", eventId: "evt_1", sig }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("already unsubscribed");
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns generic 404 when the signature is invalid", async () => {
    const res = await POST(
      makeRequest({
        inviteId: "inv_1",
        eventId: "evt_1",
        sig: "f".repeat(64),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("INVALID_LINK");
    expect(dbMock.invite.findFirst).not.toHaveBeenCalled();
  });

  it("returns generic 404 when the signature is for a different event", async () => {
    // Sig minted for evt_1 — but the caller claims evt_2. Without the
    // eventId binding this would otherwise succeed; with the binding the
    // verifier rejects it before any DB lookup.
    const sig = signInviteUnsubscribe("inv_1", "evt_1");
    const res = await POST(
      makeRequest({ inviteId: "inv_1", eventId: "evt_2", sig }),
    );
    expect(res.status).toBe(404);
    expect(dbMock.invite.findFirst).not.toHaveBeenCalled();
  });

  it("returns generic 404 when the invite row doesn't exist", async () => {
    const sig = signInviteUnsubscribe("inv_missing", "evt_1");
    dbMock.invite.findFirst.mockResolvedValueOnce(null);

    const res = await POST(
      makeRequest({ inviteId: "inv_missing", eventId: "evt_1", sig }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("INVALID_LINK");
    expect(dbMock.invite.update).not.toHaveBeenCalled();
  });

  it("returns generic 404 when the body is missing required fields (no ID leak via 400)", async () => {
    const res = await POST(makeRequest({ inviteId: "inv_1" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("INVALID_LINK");
  });

  it("returns generic 404 when the body isn't valid JSON", async () => {
    const res = await POST(makeRequest("not-json"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("INVALID_LINK");
  });
});
