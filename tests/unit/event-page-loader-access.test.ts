import { describe, it, expect, vi, beforeEach } from "vitest";

// getEventBySlug + resolveGuestAccess are DB-coupled; mock the data layer so we
// can exercise the PRIVATE -> valid-guest-token gate in isolation.
const findUniqueMock = vi.fn();
const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    event: { findUnique: findUniqueMock },
    invite: { findFirst: findFirstMock },
  },
}));
vi.mock("@/lib/tokens", () => ({
  hashToken: (t: string) => `hashed_${t}`,
}));

const { getEventBySlug } = await import("@/lib/event-page-loader");

const privateEvent = {
  id: "evt_1",
  slug: "wedding",
  title: "Wedding",
  visibility: "PRIVATE" as const,
  status: "PUBLISHED" as const,
  publishedAt: new Date(),
};
const publicEvent = { ...privateEvent, visibility: "PUBLIC" as const };
const unlistedEvent = { ...privateEvent, visibility: "UNLISTED" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEventBySlug — PRIVATE requires a VALID guest token (not mere presence)", () => {
  it("returns null for a PRIVATE event with NO token (no invite lookup)", async () => {
    findUniqueMock.mockResolvedValue(privateEvent);
    const result = await getEventBySlug("wedding", undefined);
    expect(result).toBeNull();
    // resolveGuestAccess short-circuits when there's no token.
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns null for a PRIVATE event with an INVALID token (the leak this fixes)", async () => {
    findUniqueMock.mockResolvedValue(privateEvent);
    findFirstMock.mockResolvedValue(null); // token matches no live invite
    const result = await getEventBySlug("wedding", "garbage");
    expect(result).toBeNull();
  });

  it("returns the event for a PRIVATE event with a VALID guest token", async () => {
    findUniqueMock.mockResolvedValue(privateEvent);
    findFirstMock.mockResolvedValue({ id: "inv_1", name: "Alex" });
    const result = await getEventBySlug("wedding", "tk_valid");
    expect(result).toMatchObject({ id: "evt_1", visibility: "PRIVATE" });
  });

  it("returns a PUBLIC event without consulting invites, even with a junk token", async () => {
    findUniqueMock.mockResolvedValue(publicEvent);
    const result = await getEventBySlug("wedding", "garbage");
    expect(result).toMatchObject({ id: "evt_1" });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns an UNLISTED event with no token (direct-link semantics)", async () => {
    findUniqueMock.mockResolvedValue(unlistedEvent);
    const result = await getEventBySlug("wedding", undefined);
    expect(result).toMatchObject({ id: "evt_1", visibility: "UNLISTED" });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns null for an unpublished or cancelled event regardless of token", async () => {
    findUniqueMock.mockResolvedValue({ ...publicEvent, publishedAt: null });
    expect(await getEventBySlug("wedding", undefined)).toBeNull();

    findUniqueMock.mockResolvedValue({ ...publicEvent, status: "CANCELLED" });
    expect(await getEventBySlug("wedding", undefined)).toBeNull();
  });
});
