import { describe, it, expect, vi, beforeEach } from "vitest";

// `notFound()` throws a Next-internal sentinel error in production. For tests
// we just need a recognizable throw so we can assert the call site without
// pulling in Next's runtime error handling.
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { invite: { findUnique: findUniqueMock } },
}));

// Top-level await: vi.mock is hoisted, so the mocks above are in place
// before the page module evaluates its imports.
const pageModule = await import("@/app/invite/pass/[passId]/page");
const InvitePassPage = pageModule.default;

const VALID_PASS_ID = "0123abcd-aaaa-bbbb-cccc-ddddeeeeffff";

beforeEach(() => {
  // mockClear keeps the throwing implementation set on the initial vi.fn().
  notFoundMock.mockClear();
  findUniqueMock.mockReset();
});

describe("metadata export", () => {
  it("sets robots to noindex+nofollow", () => {
    expect(pageModule.metadata.robots).toEqual({ index: false, follow: false });
  });

  it("openGraph contains no guest-identifying placeholder copy", () => {
    const og = pageModule.metadata.openGraph as
      | { title?: string; description?: string }
      | undefined;
    // Title and description should be deliberately generic — no `{name}` /
    // `{event}` substitutions, no PII.
    expect(og?.title).toBe("Event Invitation");
    expect(og?.description).toBe("View your invitation details");
  });

  it("force-dynamic is exported (route is never statically rendered)", () => {
    expect(pageModule.dynamic).toBe("force-dynamic");
  });
});

describe("InvitePassPage — 404 paths", () => {
  it("calls notFound() and skips the DB on a malformed (non-UUID) passId", async () => {
    await expect(
      InvitePassPage({ params: Promise.resolve({ passId: "not-a-uuid" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("calls notFound() after exactly one DB hit when the passId is unknown", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      InvitePassPage({ params: Promise.resolve({ passId: VALID_PASS_ID }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { passId: VALID_PASS_ID },
      include: {
        rsvp: {
          select: {
            guestName: true,
            guestCount: true,
            response: true,
            additionalGuestNames: true,
            side: true,
          },
        },
        event: {
          select: {
            title: true,
            startAt: true,
            endAt: true,
            status: true,
            timezone: true,
            venueName: true,
            address: true,
            templateId: true,
            passBackdropStyle: true,
            passBackdropImageUrl: true,
            invitationConfig: {
              select: {
                receptionStartAt: true,
                receptionVenue: true,
                receptionAddress: true,
              },
            },
          },
        },
      },
    });
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty passId without hitting the DB", async () => {
    await expect(
      InvitePassPage({ params: Promise.resolve({ passId: "" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
