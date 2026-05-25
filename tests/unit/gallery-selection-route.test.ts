import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
});

const dbMock = {
  eventGallery: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventGalleryItem: {
    count: vi.fn(),
    createMany: vi.fn(),
  },
  galleryImportJob: {
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
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

const { POST } = await import(
  "@/app/api/events/[id]/gallery/google-drive/selection/route"
);

const mockUser = { id: "user_1", status: "ACTIVE" };
const ctx = { params: Promise.resolve({ id: "evt_1" }) };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "https://example.com/api/events/evt_1/gallery/google-drive/selection",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const validFile = (overrides: Partial<{ id: string; name: string; mimeType: string; sizeBytes: number }> = {}) => ({
  id: overrides.id ?? "drive_file_1",
  name: overrides.name ?? "IMG_1234.jpg",
  mimeType: overrides.mimeType ?? "image/jpeg",
  sizeBytes: overrides.sizeBytes ?? 1_500_000,
});

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue(mockUser);
  requireEventOwnerMock.mockResolvedValue(undefined);
  assertCanMutateMock.mockReturnValue(undefined);

  // Default happy-path setup
  dbMock.galleryImportJob.findFirst.mockResolvedValue(null); // no active job
  dbMock.galleryImportJob.count.mockResolvedValue(0); // no jobs today
  dbMock.eventGallery.findFirst.mockResolvedValue(null); // no existing gallery
  dbMock.eventGalleryItem.count.mockResolvedValue(0);
  dbMock.$transaction.mockImplementation(
    async (cb: (tx: typeof dbMock) => Promise<unknown>) => cb(dbMock),
  );
  dbMock.eventGallery.create.mockResolvedValue({ id: "gal_1", status: "SYNCING" });
  dbMock.eventGalleryItem.createMany.mockResolvedValue({ count: 1 });
  dbMock.galleryImportJob.create.mockResolvedValue({
    id: "job_1",
    status: "QUEUED",
    totalItems: 1,
  });
});

describe("POST /api/events/[id]/gallery/google-drive/selection", () => {
  it("happy path: creates gallery + items + queued job", async () => {
    const res = await POST(makeRequest({ files: [validFile()] }), ctx);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toMatchObject({
      galleryId: "gal_1",
      jobId: "job_1",
      accepted: 1,
      skipped: [],
    });
    expect(dbMock.eventGallery.create).toHaveBeenCalledOnce();
    expect(dbMock.eventGalleryItem.createMany).toHaveBeenCalledOnce();
    expect(dbMock.galleryImportJob.create).toHaveBeenCalledOnce();
  });

  it("404s when the feature flag is off", async () => {
    process.env.POST_EVENT_GALLERY_ENABLED = "false";
    const res = await POST(makeRequest({ files: [validFile()] }), ctx);
    expect(res.status).toBe(404);
    process.env.POST_EVENT_GALLERY_ENABLED = "true";
  });

  it("blocks when an active (QUEUED/PROCESSING) job exists", async () => {
    dbMock.galleryImportJob.findFirst.mockResolvedValueOnce({ id: "job_existing" });
    const res = await POST(makeRequest({ files: [validFile()] }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already in progress/i);
    expect(dbMock.eventGallery.create).not.toHaveBeenCalled();
  });

  it("blocks when the daily import limit is reached", async () => {
    dbMock.galleryImportJob.count.mockResolvedValueOnce(3); // = limit
    const res = await POST(makeRequest({ files: [validFile()] }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/daily import limit/i);
  });

  it("blocks when existing + new items would exceed maxImagesPerGallery", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({ id: "gal_existing", status: "DRAFT" });
    dbMock.eventGalleryItem.count.mockResolvedValueOnce(48); // 48 + 3 > 50
    const res = await POST(
      makeRequest({ files: [validFile({ id: "a" }), validFile({ id: "b" }), validFile({ id: "c" })] }),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/can hold up to/i);
  });

  it("filters unsupported MIME types into `skipped` and still processes the rest", async () => {
    dbMock.galleryImportJob.create.mockResolvedValueOnce({
      id: "job_1",
      status: "QUEUED",
      totalItems: 1,
    });
    const res = await POST(
      makeRequest({
        files: [
          validFile({ id: "ok", mimeType: "image/jpeg" }),
          { id: "pdf", name: "doc.pdf", mimeType: "application/pdf" },
          { id: "heic", name: "phone.heic", mimeType: "image/heic", sizeBytes: 1_000_000 },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.accepted).toBe(1);
    expect(body.data.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "pdf", reason: "NOT_AN_IMAGE" }),
        expect.objectContaining({ id: "heic", reason: "UNSUPPORTED_MIME_TYPE" }),
      ]),
    );
  });

  it("filters files over the 10 MB cap", async () => {
    const res = await POST(
      makeRequest({
        files: [
          validFile({ id: "ok" }),
          validFile({ id: "big", sizeBytes: 11 * 1024 * 1024 }),
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.skipped).toEqual([
      expect.objectContaining({ id: "big", reason: "FILE_TOO_LARGE" }),
    ]);
  });

  it("400s when every file is filtered out", async () => {
    const res = await POST(
      makeRequest({
        files: [
          { id: "pdf", name: "doc.pdf", mimeType: "application/pdf" },
          { id: "heic", name: "phone.heic", mimeType: "image/heic" },
        ],
      }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(dbMock.eventGallery.create).not.toHaveBeenCalled();
  });

  it("reuses an existing EXTERNAL_LINK gallery and converts it to GOOGLE_DRIVE", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({ id: "gal_existing", status: "DRAFT" });
    dbMock.eventGallery.update.mockResolvedValue({ id: "gal_existing", status: "SYNCING" });

    const res = await POST(makeRequest({ files: [validFile()] }), ctx);
    expect(res.status).toBe(201);

    expect(dbMock.eventGallery.update).toHaveBeenCalledOnce();
    expect(dbMock.eventGallery.create).not.toHaveBeenCalled();

    const updateCall = dbMock.eventGallery.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "gal_existing" });
    expect(updateCall.data.sourceType).toBe("GOOGLE_DRIVE");
    expect(updateCall.data.status).toBe("SYNCING");
  });

  it("does NOT flip a PUBLISHED gallery back to SYNCING when adding more files", async () => {
    dbMock.eventGallery.findFirst.mockResolvedValueOnce({
      id: "gal_published",
      status: "PUBLISHED",
    });
    dbMock.eventGallery.update.mockResolvedValue({ id: "gal_published", status: "PUBLISHED" });

    await POST(makeRequest({ files: [validFile()] }), ctx);

    const updateCall = dbMock.eventGallery.update.mock.calls[0][0];
    // status should not appear in the data update at all
    expect(updateCall.data.status).toBeUndefined();
  });
});
