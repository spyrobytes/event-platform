import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRsvpSession,
  lookupRsvpSession,
  consumeRsvpSession,
  purgeExpiredRsvpSessions,
  RSVP_SESSION_TTL_SECONDS,
  RSVP_SESSION_COOKIE,
} from "@/lib/rsvp-session";
import { hashToken } from "@/lib/tokens";

// rsvp-session is a thin wrapper over Prisma. We pass a mock transaction
// client into each function rather than mocking the module — exercises the
// real logic (token generation, hash storage, expiry math) without needing
// a real DB.
type MockTx = {
  rsvpSession: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

function makeMockTx(): MockTx {
  return {
    rsvpSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe("constants", () => {
  it("session TTL matches v3 spec (20 minutes)", () => {
    expect(RSVP_SESSION_TTL_SECONDS).toBe(20 * 60);
  });

  it("cookie name is rsvp_session", () => {
    expect(RSVP_SESSION_COOKIE).toBe("rsvp_session");
  });
});

describe("createRsvpSession", () => {
  let tx: MockTx;
  beforeEach(() => {
    tx = makeMockTx();
    tx.rsvpSession.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "session-id", ...data })
    );
  });

  it("issues a raw token and stores only its hash", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { rawToken } = await createRsvpSession(tx as any, {
      eventId: "evt_1",
      inviteId: "inv_1",
    });

    const createCall = tx.rsvpSession.create.mock.calls[0][0];
    expect(createCall.data.tokenHash).toBe(hashToken(rawToken));
    // The raw token never appears in the persisted row.
    expect(JSON.stringify(createCall.data)).not.toContain(rawToken);
  });

  it("sets expiresAt 20 minutes in the future", async () => {
    const before = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createRsvpSession(tx as any, { eventId: "evt_1", inviteId: "inv_1" });
    const after = Date.now();

    const createCall = tx.rsvpSession.create.mock.calls[0][0];
    const expiresAt = (createCall.data.expiresAt as Date).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + RSVP_SESSION_TTL_SECONDS * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + RSVP_SESSION_TTL_SECONDS * 1000);
  });

  it("propagates eventId and inviteId to the row", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createRsvpSession(tx as any, { eventId: "evt_42", inviteId: "inv_99" });
    const createCall = tx.rsvpSession.create.mock.calls[0][0];
    expect(createCall.data.eventId).toBe("evt_42");
    expect(createCall.data.inviteId).toBe("inv_99");
  });

  it("issues a unique raw token on each call", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = await createRsvpSession(tx as any, { eventId: "e", inviteId: "i" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = await createRsvpSession(tx as any, { eventId: "e", inviteId: "i" });
    expect(a.rawToken).not.toBe(b.rawToken);
  });
});

describe("lookupRsvpSession", () => {
  let tx: MockTx;
  beforeEach(() => {
    tx = makeMockTx();
  });

  it("returns null when the token is empty", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lookupRsvpSession(tx as any, "");
    expect(result).toBeNull();
    // Should short-circuit without hitting the DB.
    expect(tx.rsvpSession.findUnique).not.toHaveBeenCalled();
  });

  it("looks up by hash, never by raw token", async () => {
    tx.rsvpSession.findUnique.mockResolvedValue(null);
    const raw = "raw-token-abc";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await lookupRsvpSession(tx as any, raw);
    const call = tx.rsvpSession.findUnique.mock.calls[0][0];
    expect(call.where.tokenHash).toBe(hashToken(raw));
    expect(JSON.stringify(call)).not.toContain(raw);
  });

  it("returns null when the session row is missing", async () => {
    tx.rsvpSession.findUnique.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lookupRsvpSession(tx as any, "anything");
    expect(result).toBeNull();
  });

  it("returns null when the session is already used (single-submit)", async () => {
    tx.rsvpSession.findUnique.mockResolvedValue({
      id: "s",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lookupRsvpSession(tx as any, "raw");
    expect(result).toBeNull();
  });

  it("returns null when the session has expired", async () => {
    tx.rsvpSession.findUnique.mockResolvedValue({
      id: "s",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lookupRsvpSession(tx as any, "raw");
    expect(result).toBeNull();
  });

  it("returns the session when valid", async () => {
    const session = {
      id: "s",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    tx.rsvpSession.findUnique.mockResolvedValue(session);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await lookupRsvpSession(tx as any, "raw");
    expect(result).toBe(session);
  });
});

describe("consumeRsvpSession", () => {
  it("uses a conditional updateMany with where usedAt IS NULL", async () => {
    const tx = makeMockTx();
    tx.rsvpSession.updateMany.mockResolvedValue({ count: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await consumeRsvpSession(tx as any, "session-id-xyz");
    const call = tx.rsvpSession.updateMany.mock.calls[0][0];
    expect(call.where.id).toBe("session-id-xyz");
    expect(call.where.usedAt).toBeNull();
    expect(call.data.usedAt).toBeInstanceOf(Date);
  });

  it("returns true when the consume wins the race (count: 1)", async () => {
    const tx = makeMockTx();
    tx.rsvpSession.updateMany.mockResolvedValue({ count: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await consumeRsvpSession(tx as any, "session-id");
    expect(result).toBe(true);
  });

  it("returns false when another transaction already consumed (count: 0)", async () => {
    const tx = makeMockTx();
    tx.rsvpSession.updateMany.mockResolvedValue({ count: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await consumeRsvpSession(tx as any, "session-id");
    expect(result).toBe(false);
  });
});

describe("purgeExpiredRsvpSessions", () => {
  it("deletes only sessions whose expiresAt is in the past", async () => {
    const tx = makeMockTx();
    tx.rsvpSession.deleteMany.mockResolvedValue({ count: 7 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await purgeExpiredRsvpSessions(tx as any);

    expect(count).toBe(7);
    const call = tx.rsvpSession.deleteMany.mock.calls[0][0];
    const cutoff = call.where.expiresAt.lt as Date;
    // Should be roughly "now" — within 1s of the test invocation.
    expect(Math.abs(cutoff.getTime() - Date.now())).toBeLessThan(1000);
  });
});
