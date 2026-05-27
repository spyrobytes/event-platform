import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
});

const dbMock = {
  event: { findUnique: vi.fn() },
  eventGalleryItem: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const resolveGuestAccessMock = vi.fn();
vi.mock("@/lib/event-page-loader", () => ({
  resolveGuestAccess: resolveGuestAccessMock,
  // Stubs for the rest of the module shape — the route only uses
  // resolveGuestAccess, but the import chain may pull in others.
  getEventBySlug: vi.fn(),
  getRedirectForRetiredSlug: vi.fn(),
}));

const { GET } = await import("@/app/api/events/[id]/gallery/public/route");

const ctx = { params: Promise.resolve({ id: "evt_1" }) };
const galleryRow = { id: "gal_1", sourceType: "GOOGLE_DRIVE" as const };
const publicEvent = {
  id: "evt_1",
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
  publishedAt: new Date("2026-01-01T00:00:00Z"),
  galleries: [galleryRow],
};

const itemRows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item_${i + 1}`,
    publicUrl: `https://supabase.example/${i + 1}/large.webp`,
    thumbnailUrl: `https://supabase.example/${i + 1}/thumb.webp`,
    width: 1600,
    height: 1200,
    blurDataUrl: "data:image/webp;base64,blur",
    alt: `Photo ${i + 1}`,
    caption: null,
    sortOrder: i,
  }));

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.event.findUnique.mockResolvedValue(publicEvent);
});

function makeRequest(query = ""): NextRequest {
  return new NextRequest(
    `https://example.com/api/events/evt_1/gallery/public${query}`,
    { method: "GET" },
  );
}

describe("GET /api/events/[id]/gallery/public", () => {
  it("404s when the feature flag is off", async () => {
    process.env.POST_EVENT_GALLERY_ENABLED = "false";
    try {
      const res = await GET(makeRequest(), ctx);
      expect(res.status).toBe(404);
    } finally {
      process.env.POST_EVENT_GALLERY_ENABLED = "true";
    }
  });

  it("404s when the event has no published gallery", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      galleries: [],
    });
    const res = await GET(makeRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns paginated items for a PUBLIC event with no token", async () => {
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(5));
    const res = await GET(makeRequest("?limit=4"), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    // The query asked for limit=4; the mock returns 5 (limit+1) so the
    // route detects "hasMore" and returns 4 items + a cursor.
    expect(body.data.items).toHaveLength(4);
    expect(body.data.pageInfo.nextCursor).toBe("item_4");
    expect(body.data.items[0]).toMatchObject({
      id: "item_1",
      src: expect.stringContaining("/large.webp"),
      thumbnailSrc: expect.stringContaining("/thumb.webp"),
      alt: "Photo 1",
    });
  });

  it("returns nextCursor=null when the page isn't full", async () => {
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(3));
    const res = await GET(makeRequest("?limit=24"), ctx);
    const body = await res.json();
    expect(body.data.items).toHaveLength(3);
    expect(body.data.pageInfo.nextCursor).toBeNull();
  });

  it("omits items that have null publicUrl/thumbnailUrl (corrupt rows)", async () => {
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce([
      ...itemRows(2),
      { ...itemRows(1)[0], id: "item_corrupt", publicUrl: null },
    ]);
    const res = await GET(makeRequest(), ctx);
    const body = await res.json();
    expect(body.data.items.map((i: { id: string }) => i.id)).toEqual([
      "item_1",
      "item_2",
    ]);
  });

  it("serves UNLISTED event without a guest token (direct-link semantics)", async () => {
    // Was previously asserted to 404 — that was a drift bug. The SSR route
    // /e/[slug]/gallery allows UNLISTED without a token, and the page would
    // render the first 24 items, then infinite scroll would die at the API.
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      visibility: "UNLISTED",
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(2));
    const res = await GET(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(2);
    // UNLISTED no longer requires a token — resolveGuestAccess shouldn't fire.
    expect(resolveGuestAccessMock).not.toHaveBeenCalled();
  });

  it("returns items for UNLISTED event with a valid guest token", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      visibility: "UNLISTED",
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(2));
    const res = await GET(makeRequest("?tk=tk_1"), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(2);
  });

  it("404s on PRIVATE event without a valid guest token", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      visibility: "PRIVATE",
    });
    resolveGuestAccessMock.mockResolvedValueOnce({
      accessLevel: "public",
      guestName: null,
      rsvpToken: null,
      tokenInvalid: true,
      inviteId: null,
    });
    const res = await GET(makeRequest("?tk=garbage"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns items for PRIVATE event with a valid guest token", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      visibility: "PRIVATE",
    });
    resolveGuestAccessMock.mockResolvedValueOnce({
      accessLevel: "guest",
      guestName: "Alex",
      rsvpToken: "tk_1",
      tokenInvalid: false,
      inviteId: "inv_1",
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(2));
    const res = await GET(makeRequest("?tk=tk_1"), ctx);
    expect(res.status).toBe(200);
  });

  it("404s when the event is unpublished (publishedAt is null)", async () => {
    // Page route filters unpublished events via getEventBySlug; the API
    // must agree so a leaked event ID + published gallery can't serve
    // photos behind the page route's back.
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      publishedAt: null,
    });
    const res = await GET(makeRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("404s when the event is CANCELLED", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      status: "CANCELLED",
    });
    const res = await GET(makeRequest(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns an empty page for EXTERNAL_LINK galleries", async () => {
    dbMock.event.findUnique.mockResolvedValueOnce({
      ...publicEvent,
      galleries: [{ id: "gal_external", sourceType: "EXTERNAL_LINK" }],
    });
    const res = await GET(makeRequest(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({
      items: [],
      pageInfo: { nextCursor: null },
    });
    expect(dbMock.eventGalleryItem.findMany).not.toHaveBeenCalled();
  });

  it("never leaks provider IDs or storage internals in the response", async () => {
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(itemRows(2));
    const res = await GET(makeRequest(), ctx);
    const body = await res.json();
    const itemKeys = new Set(Object.keys(body.data.items[0]));
    // PublicGalleryItem-shaped: no sourceFileId, sourceProvider,
    // storageKey, storageBucket, errorCode, etc.
    expect(itemKeys).toEqual(
      new Set(["id", "src", "thumbnailSrc", "width", "height", "blurDataUrl", "alt", "caption"]),
    );
  });
});
