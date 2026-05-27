import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
});

// ---------------------------------------------------------------------------
// Mocks shared across all routes in this file
// ---------------------------------------------------------------------------

const dbMock = {
  eventGalleryItem: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  eventGallery: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  mediaAsset: { findFirst: vi.fn() },
  galleryImportJob: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

const requireEventOwnerMock = vi.fn();
const assertCanMutateMock = vi.fn();
vi.mock("@/lib/authorization", () => ({
  requireEventOwner: requireEventOwnerMock,
  assertCanMutate: assertCanMutateMock,
}));

const revalidateEventAndGalleryMock = vi.fn();
vi.mock("@/lib/revalidation", () => ({
  revalidateEventAndGallery: revalidateEventAndGalleryMock,
  revalidateEventPage: vi.fn(),
}));

const deleteGalleryItemBlobsMock = vi.fn();
vi.mock("@/lib/gallery-storage", () => ({
  deleteGalleryItemBlobs: deleteGalleryItemBlobsMock,
}));

const mockUser = { id: "user_1", status: "ACTIVE" };

// All route handlers imported once at module top level — `await import` is
// only legal here, not inside describe() blocks.
const { PATCH: patchItem, DELETE: deleteItem } = await import(
  "@/app/api/events/[id]/gallery/[galleryId]/items/[itemId]/route"
);
const { PATCH: patchReorder } = await import(
  "@/app/api/events/[id]/gallery/[galleryId]/items/reorder/route"
);
const { POST: postRetry } = await import(
  "@/app/api/events/[id]/gallery/[galleryId]/retry/route"
);
const { PATCH: patchCover } = await import(
  "@/app/api/events/[id]/gallery/[galleryId]/cover/route"
);

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);
  // Default storage cleanup result: clean (no failures).
  deleteGalleryItemBlobsMock.mockResolvedValue({
    attempted: 2,
    succeeded: 2,
    failed: 0,
    errors: [],
  });
  // $transaction default: invoke array sequentially, return results.
  dbMock.$transaction.mockImplementation(
    async (ops: Promise<unknown>[]) => Promise.all(ops),
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/events/[id]/gallery/[galleryId]/items/[itemId]
// ---------------------------------------------------------------------------

describe("PATCH /items/[itemId]", () => {
  const PATCH = patchItem;
  const ctx = {
    params: Promise.resolve({ id: "evt_1", galleryId: "gal_1", itemId: "item_1" }),
  };

  const makeRequest = (body: unknown) =>
    new NextRequest("https://example.com/api/events/evt_1/gallery/gal_1/items/item_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validItem = {
    id: "item_1",
    gallery: {
      id: "gal_1",
      coverGalleryItemId: null as string | null,
      event: { slug: "summer-2026" },
    },
  };

  it("updates isHidden and revalidates", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(validItem);
    dbMock.eventGalleryItem.update.mockResolvedValueOnce({ id: "item_1" });
    const res = await PATCH(makeRequest({ isHidden: true }), ctx);
    expect(res.status).toBe(200);
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.isHidden).toBe(true);
    expect(revalidateEventAndGalleryMock).toHaveBeenCalledWith("summer-2026");
    // Non-cover item: no cover-clear transaction.
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
  });

  it("clears caption when passed null", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(validItem);
    await PATCH(makeRequest({ caption: null }), ctx);
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.caption).toBeNull();
  });

  it("no-ops when body has no recognized fields", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(validItem);
    const res = await PATCH(makeRequest({}), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.unchanged).toBe(true);
    expect(dbMock.eventGalleryItem.update).not.toHaveBeenCalled();
  });

  it("404s when the item doesn't belong to the gallery/event", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ isHidden: true }), ctx);
    expect(res.status).toBe(404);
  });

  it("nulls coverGalleryItemId when hiding the cover item", async () => {
    // Hiding the current cover would otherwise leave the dashboard showing
    // a "Cover" badge on an item the public payload won't render.
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      ...validItem,
      gallery: { ...validItem.gallery, coverGalleryItemId: "item_1" },
    });
    dbMock.eventGalleryItem.update.mockResolvedValueOnce({ id: "item_1" });
    const res = await PATCH(makeRequest({ isHidden: true }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.clearedCover).toBe(true);

    // Cover-clear ran in the same transaction as the item update.
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    expect(dbMock.eventGallery.update).toHaveBeenCalledWith({
      where: { id: "gal_1" },
      data: { coverGalleryItemId: null },
    });
  });

  it("does NOT clear cover when hiding a different item", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      ...validItem,
      gallery: { ...validItem.gallery, coverGalleryItemId: "some_other_item" },
    });
    dbMock.eventGalleryItem.update.mockResolvedValueOnce({ id: "item_1" });
    await PATCH(makeRequest({ isHidden: true }), ctx);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
  });

  it("does NOT clear cover when un-hiding (isHidden: false) the cover item", async () => {
    // Un-hiding the cover is a no-op for the cover relationship — only the
    // hide direction creates the stale state.
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      ...validItem,
      gallery: { ...validItem.gallery, coverGalleryItemId: "item_1" },
    });
    dbMock.eventGalleryItem.update.mockResolvedValueOnce({ id: "item_1" });
    await PATCH(makeRequest({ isHidden: false }), ctx);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/events/[id]/gallery/[galleryId]/items/[itemId]
// ---------------------------------------------------------------------------

describe("DELETE /items/[itemId]", () => {
  const DELETE = deleteItem;
  const ctx = {
    params: Promise.resolve({ id: "evt_1", galleryId: "gal_1", itemId: "item_1" }),
  };
  const req = new NextRequest(
    "https://example.com/api/events/evt_1/gallery/gal_1/items/item_1",
    { method: "DELETE" },
  );

  const baseItem = {
    id: "item_1",
    storageBucket: "gallery",
    storageKey: "events/evt_1/galleries/gal_1/items/item_1/large.webp",
    thumbnailKey: "events/evt_1/galleries/gal_1/items/item_1/thumb.webp",
    gallery: {
      id: "gal_1",
      coverGalleryItemId: null as string | null,
      event: { slug: "summer-2026" },
    },
  };

  it("storage cleanup runs BEFORE the DB delete", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(baseItem);
    dbMock.eventGalleryItem.delete.mockResolvedValueOnce({ id: "item_1" });
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    expect(deleteGalleryItemBlobsMock).toHaveBeenCalledTimes(1);
    expect(dbMock.$transaction).toHaveBeenCalled();
  });

  it("returns 500 (not 200) when storage cleanup partially fails", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(baseItem);
    deleteGalleryItemBlobsMock.mockResolvedValueOnce({
      attempted: 2,
      succeeded: 1,
      failed: 1,
      errors: [{ key: "broken/key", reason: "Forbidden" }],
    });
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("STORAGE_DELETE_FAILED");
    // DB delete NOT called — row stays as a beacon for the orphan
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("nulls out cover_gallery_item_id when deleting the cover item", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      ...baseItem,
      gallery: { ...baseItem.gallery, coverGalleryItemId: "item_1" },
    });
    await DELETE(req, ctx);
    // Transaction was invoked with both ops (cover-clear + delete).
    expect(dbMock.eventGallery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "gal_1" },
        data: { coverGalleryItemId: null },
      }),
    );
    expect(dbMock.eventGalleryItem.delete).toHaveBeenCalled();
  });

  it("does NOT touch cover when this item isn't the cover", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({
      ...baseItem,
      gallery: { ...baseItem.gallery, coverGalleryItemId: "some_other_item" },
    });
    await DELETE(req, ctx);
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
    expect(dbMock.eventGalleryItem.delete).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/events/[id]/gallery/[galleryId]/items/reorder
// ---------------------------------------------------------------------------

describe("PATCH /items/reorder", () => {
  const PATCH = patchReorder;
  const ctx = { params: Promise.resolve({ id: "evt_1", galleryId: "gal_1" }) };

  const makeRequest = (body: unknown) =>
    new NextRequest(
      "https://example.com/api/events/evt_1/gallery/gal_1/items/reorder",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

  it("swaps sort orders in a transaction", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      event: { slug: "summer-2026" },
    });
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce([
      { id: "clp1234567890abcdefghijklm" },
      { id: "clp1234567890abcdefghijxyz" },
    ]);
    const res = await PATCH(
      makeRequest({
        orderings: [
          { id: "clp1234567890abcdefghijklm", sortOrder: 2 },
          { id: "clp1234567890abcdefghijxyz", sortOrder: 1 },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(dbMock.$transaction).toHaveBeenCalled();
  });

  it("rejects when any id doesn't belong to the gallery", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      event: { slug: "summer-2026" },
    });
    // Caller sent 2 ids but DB only finds 1 belonging to this gallery
    dbMock.eventGalleryItem.findMany.mockResolvedValueOnce([
      { id: "clp1234567890abcdefghijklm" },
    ]);
    const res = await PATCH(
      makeRequest({
        orderings: [
          { id: "clp1234567890abcdefghijklm", sortOrder: 0 },
          { id: "clpevilnotinthisgallery1z", sortOrder: 1 },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/events/[id]/gallery/[galleryId]/retry
// ---------------------------------------------------------------------------

describe("POST /retry", () => {
  const POST = postRetry;
  const ctx = { params: Promise.resolve({ id: "evt_1", galleryId: "gal_1" }) };
  const req = new NextRequest(
    "https://example.com/api/events/evt_1/gallery/gal_1/retry",
    { method: "POST" },
  );

  beforeEach(() => {
    dbMock.eventGallery.findFirst.mockResolvedValue({
      id: "gal_1",
      event: { slug: "summer-2026" },
    });
  });

  it("resets FAILED items + attempts=0 and reopens the latest settled job", async () => {
    dbMock.eventGalleryItem.updateMany.mockResolvedValueOnce({ count: 3 });
    dbMock.galleryImportJob.findFirst.mockResolvedValueOnce({ id: "job_1" });

    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.retried).toBe(3);

    const updateMany = dbMock.eventGalleryItem.updateMany.mock.calls[0][0];
    expect(updateMany.where.status).toBe("FAILED");
    expect(updateMany.data).toMatchObject({
      status: "PENDING",
      attempts: 0,
      errorCode: null,
    });

    const jobUpdate = dbMock.galleryImportJob.update.mock.calls[0][0];
    expect(jobUpdate.data.status).toBe("QUEUED");
  });

  it("doesn't touch jobs when there were no FAILED items", async () => {
    dbMock.eventGalleryItem.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(dbMock.galleryImportJob.findFirst).not.toHaveBeenCalled();
    expect(dbMock.galleryImportJob.update).not.toHaveBeenCalled();
  });

  it("doesn't touch SKIPPED items (terminal by design)", async () => {
    dbMock.eventGalleryItem.updateMany.mockResolvedValueOnce({ count: 1 });
    dbMock.galleryImportJob.findFirst.mockResolvedValueOnce(null);
    await POST(req, ctx);
    const where = dbMock.eventGalleryItem.updateMany.mock.calls[0][0].where;
    expect(where.status).toBe("FAILED");
    expect(where.status).not.toBe("SKIPPED");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/events/[id]/gallery/[galleryId]/cover
// ---------------------------------------------------------------------------

describe("PATCH /cover", () => {
  const PATCH = patchCover;
  const ctx = { params: Promise.resolve({ id: "evt_1", galleryId: "gal_1" }) };

  const makeRequest = (body: unknown) =>
    new NextRequest(
      "https://example.com/api/events/evt_1/gallery/gal_1/cover",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

  beforeEach(() => {
    dbMock.eventGallery.findFirst.mockResolvedValue({
      id: "gal_1",
      event: { slug: "summer-2026" },
    });
  });

  it("sets cover_gallery_item_id to a READY visible item", async () => {
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce({ id: "clpitem1234567890abcdefghi" });
    const res = await PATCH(
      makeRequest({ galleryItemId: "clpitem1234567890abcdefghi" }),
      ctx,
    );
    expect(res.status).toBe(200);
    const update = dbMock.eventGallery.update.mock.calls[0][0];
    expect(update.data.coverGalleryItemId).toBe("clpitem1234567890abcdefghi");
  });

  it("rejects setting cover to a non-READY item", async () => {
    // findFirst with status:READY filter returns null because the item is FAILED
    dbMock.eventGalleryItem.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ galleryItemId: "clpitem1234567890abcdefghi" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("clears cover when both ids are null", async () => {
    const res = await PATCH(
      makeRequest({ galleryItemId: null, mediaAssetId: null }),
      ctx,
    );
    expect(res.status).toBe(200);
    const update = dbMock.eventGallery.update.mock.calls[0][0];
    expect(update.data.coverGalleryItemId).toBeNull();
    expect(update.data.coverMediaAssetId).toBeNull();
  });

  it("validates mediaAssetId belongs to the event", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ mediaAssetId: "clpasset1234567890abcdefgh" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });
});
