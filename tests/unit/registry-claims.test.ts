import { describe, it, expect, vi } from "vitest";
import {
  aggregateGuestClaims,
  findClaimableItem,
  runWithSerializableRetry,
  summarizeClaims,
} from "@/lib/registry-claims";
import type { EventPageConfigV1 } from "@/schemas/event-page";

function buildConfig(items: Array<{ id: string; name?: string; type?: "link" | "fund"; url?: string }>): EventPageConfigV1 {
  return {
    version: 1,
    sections: [
      {
        type: "registry",
        data: {
          heading: "Registry",
          items: items.map((i) => ({
            id: i.id,
            name: i.name ?? i.id,
            type: i.type ?? "link",
            url: i.url ?? "https://example.com",
          })),
        },
      },
    ],
  } as unknown as EventPageConfigV1;
}

describe("summarizeClaims", () => {
  it("splits claimedByOthers vs myClaim by inviteId", () => {
    const out = summarizeClaims({
      allClaims: [
        { id: "c1", itemId: "item-a", inviteId: "me", quantity: 1, source: "GUEST" },
        { id: "c2", itemId: "item-a", inviteId: "other-1", quantity: 1, source: "GUEST" },
        { id: "c3", itemId: "item-a", inviteId: "other-2", quantity: 2, source: "GUEST" },
      ],
      myInviteId: "me",
    });
    const a = out.get("item-a")!;
    expect(a.myClaimId).toBe("c1");
    expect(a.myClaimQuantity).toBe(1);
    expect(a.claimedByOthers).toBe(3);
  });

  it("treats all claims as others when myInviteId is null (public viewer)", () => {
    const out = summarizeClaims({
      allClaims: [
        { id: "c1", itemId: "item-a", inviteId: "guest-1", quantity: 1, source: "GUEST" },
        { id: "c2", itemId: "item-a", inviteId: "guest-2", quantity: 1, source: "GUEST" },
      ],
      myInviteId: null,
    });
    const a = out.get("item-a")!;
    expect(a.myClaimId).toBeNull();
    expect(a.claimedByOthers).toBe(2);
  });

  it("excludes organizer claims from the counts", () => {
    const out = summarizeClaims({
      allClaims: [
        { id: "c1", itemId: "item-a", inviteId: null, quantity: 1, source: "ORGANIZER" },
        { id: "c2", itemId: "item-a", inviteId: "me", quantity: 1, source: "GUEST" },
      ],
      myInviteId: "me",
    });
    const a = out.get("item-a")!;
    expect(a.myClaimQuantity).toBe(1);
    expect(a.claimedByOthers).toBe(0);
  });

  it("groups by itemId so unrelated items stay separate", () => {
    const out = summarizeClaims({
      allClaims: [
        { id: "c1", itemId: "item-a", inviteId: "g1", quantity: 1, source: "GUEST" },
        { id: "c2", itemId: "item-b", inviteId: "g1", quantity: 1, source: "GUEST" },
      ],
      myInviteId: null,
    });
    expect(out.get("item-a")!.claimedByOthers).toBe(1);
    expect(out.get("item-b")!.claimedByOthers).toBe(1);
  });
});

describe("aggregateGuestClaims", () => {
  it("sums guest quantities per item and ignores organizer rows", () => {
    const totals = aggregateGuestClaims([
      { itemId: "a", quantity: 1, source: "GUEST" },
      { itemId: "a", quantity: 2, source: "GUEST" },
      { itemId: "a", quantity: 5, source: "ORGANIZER" },
      { itemId: "b", quantity: 1, source: "GUEST" },
    ]);
    expect(totals.get("a")).toBe(3);
    expect(totals.get("b")).toBe(1);
  });
});

describe("findClaimableItem", () => {
  it("returns the item when it exists and is a link-type gift", () => {
    const cfg = buildConfig([{ id: "i-1" }]);
    expect(findClaimableItem(cfg, "i-1")?.id).toBe("i-1");
  });

  it("returns null for fund items (funds are not claimable)", () => {
    const cfg = buildConfig([{ id: "i-1", type: "fund" }]);
    expect(findClaimableItem(cfg, "i-1")).toBeNull();
  });

  it("returns null when the item does not exist", () => {
    const cfg = buildConfig([{ id: "i-1" }]);
    expect(findClaimableItem(cfg, "nope")).toBeNull();
  });
});

describe("runWithSerializableRetry", () => {
  it("returns the result when the first attempt succeeds", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(runWithSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once on Postgres serialization failure (40001) and returns the retry's result", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("serialization failure"), { code: "40001" }))
      .mockResolvedValueOnce("second-try");
    await expect(runWithSerializableRetry(fn)).resolves.toBe("second-try");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-serialization errors", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("boom"), { code: "23505" }));
    await expect(runWithSerializableRetry(fn)).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("propagates the retry's error if it also fails (no third attempt)", async () => {
    const err = Object.assign(new Error("still racing"), { code: "40001" });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(runWithSerializableRetry(fn)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
