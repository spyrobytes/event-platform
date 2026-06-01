import { describe, it, expect, vi } from "vitest";
import { exceedsEventCapacity } from "@/lib/event-capacity";

// The helper only needs `tx.$queryRaw`; fake it. Each test queues the lock
// result, then (when reached) the seat-sum result, in order.
function makeTx(queryRaw: ReturnType<typeof vi.fn>) {
  return { $queryRaw: queryRaw } as unknown as Parameters<
    typeof exceedsEventCapacity
  >[0];
}

const base = {
  eventId: "evt_1",
  inviteId: "inv_1",
  response: "YES",
  guestCount: 1,
  maxAttendees: 10 as number | null,
};

describe("exceedsEventCapacity", () => {
  it("returns false without querying for a non-YES response", async () => {
    const q = vi.fn();
    expect(await exceedsEventCapacity(makeTx(q), { ...base, response: "NO" })).toBe(false);
    expect(q).not.toHaveBeenCalled();
  });

  it("returns false without querying when the event is uncapped (maxAttendees null)", async () => {
    const q = vi.fn();
    expect(await exceedsEventCapacity(makeTx(q), { ...base, maxAttendees: null })).toBe(false);
    expect(q).not.toHaveBeenCalled();
  });

  it("locks the event row first, then SUMs seats excluding this invite's own row", async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce([{ max_attendees: 10 }])
      .mockResolvedValueOnce([{ seats: BigInt(7) }]);
    await exceedsEventCapacity(makeTx(q), { ...base, guestCount: 3 });
    expect(q).toHaveBeenCalledTimes(2);
    const lockSql = (q.mock.calls[0][0] as string[]).join("?");
    const sumSql = (q.mock.calls[1][0] as string[]).join("?");
    expect(lockSql).toContain("FOR UPDATE");
    expect(sumSql).toContain("SUM(guest_count)");
    // The self-exclusion is what makes the count snapshot-independent (#1).
    expect(sumSql).toContain("IS DISTINCT FROM");
  });

  it("allows a party that exactly fills the cap (boundary is > not >=)", async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce([{ max_attendees: 10 }])
      .mockResolvedValueOnce([{ seats: BigInt(7) }]);
    expect(await exceedsEventCapacity(makeTx(q), { ...base, guestCount: 3 })).toBe(false); // 7 + 3 = 10
  });

  it("rejects a party that overflows the cap", async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce([{ max_attendees: 10 }])
      .mockResolvedValueOnce([{ seats: BigInt(8) }]);
    expect(await exceedsEventCapacity(makeTx(q), { ...base, guestCount: 3 })).toBe(true); // 8 + 3 = 11
  });

  it("treats a cap of 0 as closed, not unlimited (rejects any YES)", async () => {
    // Regression guard for the falsy-zero bug: `if (maxAttendees)` would have
    // skipped the check entirely for a 0 cap.
    const q = vi
      .fn()
      .mockResolvedValueOnce([{ max_attendees: 0 }])
      .mockResolvedValueOnce([{ seats: BigInt(0) }]);
    expect(
      await exceedsEventCapacity(makeTx(q), { ...base, maxAttendees: 0, guestCount: 1 })
    ).toBe(true); // 0 + 1 > 0
  });

  it("returns false if the cap was removed between fetch and lock (no SUM query)", async () => {
    const q = vi.fn().mockResolvedValueOnce([{ max_attendees: null }]);
    expect(await exceedsEventCapacity(makeTx(q), base)).toBe(false);
    expect(q).toHaveBeenCalledTimes(1); // locked, saw no cap, skipped the SUM
  });
});
