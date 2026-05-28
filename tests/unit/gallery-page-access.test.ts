import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
});

// notFound() throws a Next.js sentinel we can catch. Replace it with a
// plain Error so the page-level access checks are visible to the test.
const notFoundError = new Error("NEXT_NOT_FOUND");
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw notFoundError;
  },
  permanentRedirect: vi.fn(),
}));

const getEventBySlugMock = vi.fn();
const resolveGuestAccessMock = vi.fn();
const getRedirectForRetiredSlugMock = vi.fn();
vi.mock("@/lib/event-page-loader", () => ({
  getEventBySlug: getEventBySlugMock,
  resolveGuestAccess: resolveGuestAccessMock,
  getRedirectForRetiredSlug: getRedirectForRetiredSlugMock,
}));

const getPublishedGalleryMock = vi.fn();
vi.mock("@/lib/gallery-data", () => ({
  getPublishedGalleryForEvent: getPublishedGalleryMock,
  getPublicGalleryItems: vi.fn(),
  GALLERY_PAGE_SIZE: 24,
  getGalleryForOrganizer: vi.fn(),
}));

vi.mock("@/components/features/PostEventGallery", () => ({
  GalleryExternalLinkLanding: () => null,
  PostEventGalleryGrid: () => null,
  PostEventHero: () => null,
  PoweredByEventFXr: () => null,
  ThankYouSection: () => null,
  ShareCta: () => null,
}));

// WishesEcho lives outside the barrel because it imports `db` (server-only).
// The page imports it by direct file path, so the mock targets that path too.
vi.mock("@/components/features/PostEventGallery/WishesEcho", () => ({
  WishesEcho: () => null,
}));

const PageModule = await import("@/app/e/[slug]/gallery/page");
const PostEventGalleryPage = PageModule.default;

const baseEvent = {
  id: "evt_1",
  title: "Wedding",
  slug: "wedding-2026",
  description: null,
  startAt: null,
  endAt: null,
  timezone: "UTC",
  venueName: null,
  address: null,
  city: null,
  country: null,
  coverImageUrl: null,
  status: "PUBLISHED" as const,
  visibility: "PUBLIC" as const,
  pageConfig: null,
  templateId: null,
  publishedAt: new Date(),
  rsvpDeadline: null,
  creator: { name: "Host" },
  organization: null,
  mediaAssets: [],
};

const baseGallery = {
  id: "gal_1",
  sourceType: "NATIVE" as const,
  title: null,
  description: null,
  coverUrl: null,
  items: [],
  pageInfo: { nextCursor: null },
  presentation: {
    variant: "classic-grid" as const,
    showFeaturedStrip: false,
    showWishesEcho: false,
  },
  featuredItems: [],
};

function call(params: { slug: string }, search: { tk?: string }) {
  return PostEventGalleryPage({
    params: Promise.resolve(params),
    searchParams: Promise.resolve(search),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /e/[slug]/gallery — access control", () => {
  it("404s on PRIVATE event with an INVALID guest token (no exposure)", async () => {
    getEventBySlugMock.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE" as const,
    });
    // resolveGuestAccess returns accessLevel=public + tokenInvalid=true for
    // any token that fails to hash-match a live invite.
    resolveGuestAccessMock.mockResolvedValue({
      accessLevel: "public",
      guestName: null,
      rsvpToken: null,
      tokenInvalid: true,
      inviteId: null,
    });
    getPublishedGalleryMock.mockResolvedValue(baseGallery);

    await expect(
      call({ slug: "wedding-2026" }, { tk: "garbage" }),
    ).rejects.toBe(notFoundError);
    // Critical assertion: gallery data is NEVER fetched when the token check
    // fails. Prevents accidental information leakage via cover/title/etc.
    expect(getPublishedGalleryMock).not.toHaveBeenCalled();
  });

  it("renders for PRIVATE event with a VALID guest token", async () => {
    getEventBySlugMock.mockResolvedValue({
      ...baseEvent,
      visibility: "PRIVATE" as const,
    });
    resolveGuestAccessMock.mockResolvedValue({
      accessLevel: "guest",
      guestName: "Alex",
      rsvpToken: "tk_valid",
      tokenInvalid: false,
      inviteId: "inv_1",
    });
    getPublishedGalleryMock.mockResolvedValue(baseGallery);

    const result = await call({ slug: "wedding-2026" }, { tk: "tk_valid" });
    expect(result).toBeTruthy();
    expect(getPublishedGalleryMock).toHaveBeenCalledWith("evt_1");
  });

  it("renders for UNLISTED event with no token (direct-link semantics)", async () => {
    getEventBySlugMock.mockResolvedValue({
      ...baseEvent,
      visibility: "UNLISTED" as const,
    });
    resolveGuestAccessMock.mockResolvedValue({
      accessLevel: "public",
      guestName: null,
      rsvpToken: null,
      tokenInvalid: false,
      inviteId: null,
    });
    getPublishedGalleryMock.mockResolvedValue(baseGallery);

    const result = await call({ slug: "wedding-2026" }, {});
    expect(result).toBeTruthy();
    expect(getPublishedGalleryMock).toHaveBeenCalledWith("evt_1");
  });

  it("renders for PUBLIC event with no token", async () => {
    getEventBySlugMock.mockResolvedValue(baseEvent);
    resolveGuestAccessMock.mockResolvedValue({
      accessLevel: "public",
      guestName: null,
      rsvpToken: null,
      tokenInvalid: false,
      inviteId: null,
    });
    getPublishedGalleryMock.mockResolvedValue(baseGallery);

    const result = await call({ slug: "wedding-2026" }, {});
    expect(result).toBeTruthy();
  });
});
