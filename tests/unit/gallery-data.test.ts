import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  eventGallery: { findFirst: vi.fn() },
  eventGalleryItem: { findMany: vi.fn(), findFirst: vi.fn() },
  mediaAsset: { findFirst: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("@/lib/gallery-trusted-hosts", () => ({
  getTrustedHostName: () => "Example",
}));

const { getPublishedGalleryForEvent, GALLERY_PAGE_SIZE } = await import(
  "@/lib/gallery-data"
);

function buildItemRow(i: number) {
  return {
    id: `item_${i}`,
    publicUrl: `https://supabase.example/${i}/large.webp`,
    thumbnailUrl: `https://supabase.example/${i}/thumb.webp`,
    width: 1600,
    height: 1200,
    blurDataUrl: null,
    alt: `Photo ${i}`,
    caption: null,
    sortOrder: i,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublishedGalleryForEvent — cover resolution", () => {
  it("resolves the explicit cover even when it's beyond the first page", async () => {
    // 24 items returned by the first-page query (limit+1=25, so hasMore=true)
    // and the explicit cover points at item_30, which is NOT in the first page.
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      title: null,
      description: null,
      sourceType: "GOOGLE_DRIVE" as const,
      sourceRef: { kind: "GOOGLE_DRIVE" },
      presentation: null,
      coverGalleryItemId: "item_30",
      coverMediaAssetId: null,
      coverAsset: null,
    });
    // First-page items query: 25 rows so the route detects hasMore and
    // returns 24 + nextCursor (so item_30 is genuinely off-page).
    const firstPageRows = Array.from({ length: GALLERY_PAGE_SIZE + 1 }, (_, i) =>
      buildItemRow(i + 1),
    );
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(firstPageRows);
    // The cover-specific lookup: a separate findFirst targeting the cover id.
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      id: "item_30",
      publicUrl: "https://supabase.example/30/large.webp",
      thumbnailUrl: "https://supabase.example/30/thumb.webp",
    });

    const gallery = await getPublishedGalleryForEvent("evt_1");

    expect(gallery).not.toBeNull();
    expect(gallery?.coverUrl).toBe("https://supabase.example/30/thumb.webp");
    // We did re-fetch the cover separately (the off-page case).
    expect(dbMock.eventGalleryItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: "item_30",
        galleryId: "gal_1",
        status: "READY",
        isHidden: false,
      },
      select: { id: true, thumbnailUrl: true, publicUrl: true },
    });
    // No hero fallback needed — the explicit cover resolved.
    expect(dbMock.mediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("does NOT re-fetch the cover when it's already on the first page", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      title: null,
      description: null,
      sourceType: "GOOGLE_DRIVE" as const,
      sourceRef: { kind: "GOOGLE_DRIVE" },
      presentation: null,
      coverGalleryItemId: "item_3",
      coverMediaAssetId: null,
      coverAsset: null,
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => buildItemRow(i + 1)),
    );

    const gallery = await getPublishedGalleryForEvent("evt_1");

    expect(gallery?.coverUrl).toBe("https://supabase.example/3/thumb.webp");
    expect(dbMock.eventGalleryItem.findFirst).not.toHaveBeenCalled();
  });

  it("falls through to first visible item when the off-page cover is FAILED/hidden", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      title: null,
      description: null,
      sourceType: "GOOGLE_DRIVE" as const,
      sourceRef: { kind: "GOOGLE_DRIVE" },
      presentation: null,
      coverGalleryItemId: "item_99",
      coverMediaAssetId: null,
      coverAsset: null,
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce(
      Array.from({ length: 3 }, (_, i) => buildItemRow(i + 1)),
    );
    // Off-page lookup misses (item gone or hidden) — findFirst returns null
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(null);

    const gallery = await getPublishedGalleryForEvent("evt_1");

    expect(gallery?.coverUrl).toBe("https://supabase.example/1/thumb.webp");
  });
});
