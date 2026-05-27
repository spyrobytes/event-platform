import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
});

const dbMock = {
  event: { findUniqueOrThrow: vi.fn() },
  eventGallery: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventGalleryItem: { deleteMany: vi.fn() },
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

const revalidateMock = vi.fn();
vi.mock("@/lib/revalidation", () => ({
  revalidateEventAndGallery: revalidateMock,
  revalidateEventPage: vi.fn(),
}));

const deleteGalleryItemBlobsMock = vi.fn();
vi.mock("@/lib/gallery-storage", () => ({
  deleteGalleryItemBlobs: deleteGalleryItemBlobsMock,
}));

const { POST } = await import(
  "@/app/api/events/[id]/gallery/external-link/route"
);

const ctx = { params: Promise.resolve({ id: "evt_1" }) };

const mockUser = { id: "user_1", status: "ACTIVE" };

function makeRequest(body: unknown) {
  return new NextRequest(
    "https://example.com/api/events/evt_1/gallery/external-link",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const validBody = {
  url: "https://drive.google.com/drive/folders/abc123",
  ctaLabel: "View Photos",
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);
  dbMock.event.findUniqueOrThrow.mockResolvedValue({ slug: "summer-2026" });
  deleteGalleryItemBlobsMock.mockResolvedValue({
    attempted: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  });
  dbMock.$transaction.mockImplementation(
    async (fn: (tx: typeof dbMock) => Promise<unknown>) => fn(dbMock),
  );
});

describe("POST /api/events/[id]/gallery/external-link — source switch cleanup", () => {
  it("creates a new EXTERNAL_LINK gallery when none exists (no cleanup)", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce(null);
    dbMock.eventGallery.create.mockResolvedValueOnce({
      id: "gal_new",
      status: "DRAFT",
      sourceType: "EXTERNAL_LINK",
      title: null,
      description: null,
      publishedAt: null,
    });

    const res = await POST(makeRequest(validBody), ctx);
    expect(res.status).toBe(201);
    expect(deleteGalleryItemBlobsMock).not.toHaveBeenCalled();
    expect(dbMock.eventGalleryItem.deleteMany).not.toHaveBeenCalled();
  });

  it("preserves existing EXTERNAL_LINK gallery without item-cleanup", async () => {
    // Same source type — no items to clean up regardless.
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "EXTERNAL_LINK",
      items: [],
    });
    dbMock.eventGallery.update.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "EXTERNAL_LINK",
      title: null,
      description: null,
      publishedAt: new Date(),
    });

    const res = await POST(makeRequest(validBody), ctx);
    expect(res.status).toBe(200);
    expect(deleteGalleryItemBlobsMock).not.toHaveBeenCalled();
    expect(dbMock.eventGalleryItem.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes native items + blobs when switching NATIVE → EXTERNAL_LINK", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "GOOGLE_DRIVE",
      items: [
        {
          id: "item_1",
          storageBucket: "gallery",
          storageKey: "events/evt_1/galleries/gal_1/items/item_1/large.webp",
          thumbnailKey: "events/evt_1/galleries/gal_1/items/item_1/thumb.webp",
        },
        {
          id: "item_2",
          storageBucket: "gallery",
          storageKey: "events/evt_1/galleries/gal_1/items/item_2/large.webp",
          thumbnailKey: "events/evt_1/galleries/gal_1/items/item_2/thumb.webp",
        },
      ],
    });
    deleteGalleryItemBlobsMock.mockResolvedValueOnce({
      attempted: 4,
      succeeded: 4,
      failed: 0,
      errors: [],
    });
    dbMock.eventGalleryItem.deleteMany.mockResolvedValueOnce({ count: 2 });
    dbMock.eventGallery.update.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "EXTERNAL_LINK",
      title: null,
      description: null,
      publishedAt: new Date(),
    });

    const res = await POST(makeRequest(validBody), ctx);
    expect(res.status).toBe(200);

    // Storage cleanup ran with the existing items' blob refs.
    expect(deleteGalleryItemBlobsMock).toHaveBeenCalledTimes(1);
    const blobs = deleteGalleryItemBlobsMock.mock.calls[0][0];
    expect(blobs).toHaveLength(2);
    expect(blobs[0]).toMatchObject({
      bucket: "gallery",
      storageKey: expect.stringContaining("item_1"),
      thumbnailKey: expect.stringContaining("item_1"),
    });

    // DB items deleted via deleteMany.
    expect(dbMock.eventGalleryItem.deleteMany).toHaveBeenCalledWith({
      where: { galleryId: "gal_1" },
    });

    // coverGalleryItemId nulled in the same update.
    const update = dbMock.eventGallery.update.mock.calls[0][0];
    expect(update.data.coverGalleryItemId).toBeNull();
    expect(update.data.sourceType).toBe("EXTERNAL_LINK");
  });

  it("aborts the source switch when storage cleanup partially fails", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_1",
      status: "PUBLISHED",
      sourceType: "GOOGLE_DRIVE",
      items: [
        {
          id: "item_1",
          storageBucket: "gallery",
          storageKey: "key_1",
          thumbnailKey: "thumb_1",
        },
      ],
    });
    deleteGalleryItemBlobsMock.mockResolvedValueOnce({
      attempted: 2,
      succeeded: 1,
      failed: 1,
      errors: [{ key: "thumb_1", reason: "Forbidden" }],
    });

    const res = await POST(makeRequest(validBody), ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("STORAGE_DELETE_FAILED");
    // Critical: we never flipped the source type if storage cleanup failed.
    expect(dbMock.eventGalleryItem.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
  });
});
