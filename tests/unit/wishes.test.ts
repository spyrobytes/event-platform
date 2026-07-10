import { describe, it, expect, vi, beforeEach } from "vitest";
import { manualWishSchema } from "@/schemas/manual-wish";

const dbMock = {
  rSVP: { findMany: vi.fn() },
  manualWish: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { getApprovedWishes } = await import("@/lib/wishes");

function rsvpRow(i: number, approvedAt: Date) {
  return {
    id: `rsvp_${i}`,
    guestName: `Guest ${i}`,
    messageToHost: `Guest message ${i}`,
    messageApprovedAt: approvedAt,
    respondedAt: new Date(approvedAt.getTime() - 60_000),
  };
}

function manualRow(i: number, createdAt: Date) {
  return {
    id: `manual_${i}`,
    authorName: `Author ${i}`,
    message: `Manual message ${i}`,
    createdAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.rSVP.findMany.mockResolvedValue([]);
  dbMock.manualWish.findMany.mockResolvedValue([]);
});

describe("manualWishSchema", () => {
  it("trims and accepts a valid wish", () => {
    const parsed = manualWishSchema.parse({
      authorName: "  Aunt May  ",
      message: "  Congratulations!  ",
    });
    expect(parsed).toEqual({
      authorName: "Aunt May",
      message: "Congratulations!",
    });
  });

  it("rejects whitespace-only authorName and message", () => {
    expect(() =>
      manualWishSchema.parse({ authorName: "   ", message: "hi" })
    ).toThrow();
    expect(() =>
      manualWishSchema.parse({ authorName: "May", message: "   " })
    ).toThrow();
  });

  it("enforces the guest-side length caps (200 / 1000)", () => {
    expect(() =>
      manualWishSchema.parse({ authorName: "x".repeat(201), message: "hi" })
    ).toThrow();
    expect(() =>
      manualWishSchema.parse({ authorName: "May", message: "x".repeat(1001) })
    ).toThrow();
  });
});

describe("getApprovedWishes — merge + ordering", () => {
  it("interleaves guest and manual wishes newest-first", async () => {
    dbMock.rSVP.findMany.mockResolvedValue([
      rsvpRow(1, new Date("2026-07-03T00:00:00Z")),
      rsvpRow(2, new Date("2026-07-01T00:00:00Z")),
    ]);
    dbMock.manualWish.findMany.mockResolvedValue([
      manualRow(1, new Date("2026-07-04T00:00:00Z")),
      manualRow(2, new Date("2026-07-02T00:00:00Z")),
    ]);

    const { wishes, hasMore } = await getApprovedWishes("evt_1");
    expect(wishes.map((w) => w.id)).toEqual([
      "manual_1",
      "rsvp_1",
      "manual_2",
      "rsvp_2",
    ]);
    expect(hasMore).toBe(false);
  });

  it("maps both sources to the shared DTO shape", async () => {
    dbMock.rSVP.findMany.mockResolvedValue([
      rsvpRow(1, new Date("2026-07-03T00:00:00Z")),
    ]);
    dbMock.manualWish.findMany.mockResolvedValue([
      manualRow(1, new Date("2026-07-01T00:00:00Z")),
    ]);

    const { wishes } = await getApprovedWishes("evt_1");
    expect(wishes).toEqual([
      { id: "rsvp_1", message: "Guest message 1", authorName: "Guest 1" },
      { id: "manual_1", message: "Manual message 1", authorName: "Author 1" },
    ]);
  });

  it("falls back to respondedAt for legacy approved rows without messageApprovedAt", async () => {
    dbMock.rSVP.findMany.mockResolvedValue([
      {
        id: "rsvp_legacy",
        guestName: "Legacy",
        messageToHost: "Old but gold",
        messageApprovedAt: null,
        respondedAt: new Date("2026-07-05T00:00:00Z"),
      },
    ]);
    dbMock.manualWish.findMany.mockResolvedValue([
      manualRow(1, new Date("2026-07-04T00:00:00Z")),
    ]);

    const { wishes } = await getApprovedWishes("evt_1");
    expect(wishes.map((w) => w.id)).toEqual(["rsvp_legacy", "manual_1"]);
  });

  it("caps at limit across BOTH sources and reports hasMore", async () => {
    // limit=2 → the helper asks each source for 3 (limit+1).
    dbMock.rSVP.findMany.mockResolvedValue([
      rsvpRow(1, new Date("2026-07-06T00:00:00Z")),
      rsvpRow(2, new Date("2026-07-04T00:00:00Z")),
      rsvpRow(3, new Date("2026-07-02T00:00:00Z")),
    ]);
    dbMock.manualWish.findMany.mockResolvedValue([
      manualRow(1, new Date("2026-07-05T00:00:00Z")),
    ]);

    const { wishes, hasMore } = await getApprovedWishes("evt_1", { limit: 2 });
    expect(wishes.map((w) => w.id)).toEqual(["rsvp_1", "manual_1"]);
    expect(hasMore).toBe(true);

    expect(dbMock.rSVP.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(dbMock.manualWish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });

  it("hasMore is false when the merged set exactly fits the limit", async () => {
    dbMock.rSVP.findMany.mockResolvedValue([
      rsvpRow(1, new Date("2026-07-06T00:00:00Z")),
    ]);
    dbMock.manualWish.findMany.mockResolvedValue([
      manualRow(1, new Date("2026-07-05T00:00:00Z")),
    ]);

    const { wishes, hasMore } = await getApprovedWishes("evt_1", { limit: 2 });
    expect(wishes).toHaveLength(2);
    expect(hasMore).toBe(false);
  });

  it("passes no take when no limit is given (full list)", async () => {
    await getApprovedWishes("evt_1");
    expect(dbMock.rSVP.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: undefined })
    );
  });
});
