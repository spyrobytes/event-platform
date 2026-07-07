import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.POST_EVENT_GALLERY_ENABLED = "true";
  process.env.PROVIDER_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

// ---------------------------------------------------------------------------
// Mock surfaces: DB, getValidAccessToken, Drive download, image pipeline.
// ---------------------------------------------------------------------------

const dbMock = {
  eventGalleryItem: {
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  eventGallery: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  galleryImportJob: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const getValidAccessTokenMock = vi.fn();
const ProviderTokenNotFoundErrorCls = class extends Error {
  readonly code = "PROVIDER_TOKEN_NOT_FOUND";
};
const ProviderTokenRevokedErrorCls = class extends Error {
  readonly code = "PROVIDER_TOKEN_REVOKED";
};
vi.mock("@/lib/provider-tokens", () => ({
  getValidAccessToken: getValidAccessTokenMock,
  encryptToken: vi.fn(),
  decryptToken: vi.fn(),
  ProviderTokenNotFoundError: ProviderTokenNotFoundErrorCls,
  ProviderTokenRevokedError: ProviderTokenRevokedErrorCls,
}));

const downloadDriveFileMock = vi.fn();
class GoogleDriveDownloadErrorCls extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode:
      | "SOURCE_FILE_NOT_FOUND"
      | "SOURCE_PERMISSION_DENIED"
      | "SOURCE_DOWNLOAD_FAILED"
      | "FILE_TOO_LARGE",
    detail?: string,
  ) {
    super(`Google Drive download ${status}: ${detail ?? errorCode}`);
  }
}
vi.mock("@/lib/providers/google-drive", () => ({
  downloadDriveFile: downloadDriveFileMock,
  GoogleDriveDownloadError: GoogleDriveDownloadErrorCls,
}));

const uploadFileMock = vi.fn();
// Typed to ensureBucket's real return shape so tests can resolve the
// failure arm ({ success: false, error }) without a TS object-literal error.
const ensureBucketMock = vi.fn<
  () => Promise<{ success: boolean; error?: string }>
>(async () => ({ success: true }));
vi.mock("@/lib/supabase-storage", () => ({
  uploadFile: uploadFileMock,
  ensureBucket: ensureBucketMock,
  BUCKETS: { gallery: "gallery", eventAssets: "event-assets" },
}));

// optimizeImage + generateBlurDataUrl come from media-validation; the
// worker calls both. Stub with deterministic outputs.
const optimizeImageMock = vi.fn();
const generateBlurDataUrlMock = vi.fn();
vi.mock("@/lib/media-validation", () => ({
  optimizeImage: optimizeImageMock,
  generateBlurDataUrl: generateBlurDataUrlMock,
}));

// file-type uses dynamic import inside the worker. Mock the module so
// the dynamic import resolves to our stub.
const fileTypeFromBufferMock = vi.fn();
vi.mock("file-type", () => ({
  fileTypeFromBuffer: fileTypeFromBufferMock,
}));

// sharp() is called for the thumbnail and for metadata reads. The
// optimizeImage mock already covers the large-image path; we only need
// the thumbnail .resize(...).webp(...).toBuffer() chain here.
const sharpThumbBuffer = Buffer.from("thumb-bytes");
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(sharpThumbBuffer),
    metadata: vi.fn().mockResolvedValue({ width: 1600, height: 1200 }),
  })),
}));

const { __testing, processGalleryImports } = await import(
  "@/lib/gallery-worker"
);
const { processItem, persistOutcome, reconcileJobs } = __testing;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<{ id: string; gallery_id: string; source_file_id: string; attempts: number; original_name: string | null; alt: string }> = {}) => ({
  id: overrides.id ?? "item_1",
  gallery_id: overrides.gallery_id ?? "gal_1",
  source_file_id: overrides.source_file_id ?? "drive_file_1",
  attempts: overrides.attempts ?? 1,
  original_name: overrides.original_name ?? null,
  alt: overrides.alt ?? "",
});

const gallery = { id: "gal_1", event_id: "evt_1" };
const event = { id: "evt_1", creator_id: "user_1" };

const downloadedJpeg = {
  buffer: Buffer.from("fake-jpeg-bytes"),
  mimeType: "image/jpeg",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults that make the happy path succeed.
  getValidAccessTokenMock.mockResolvedValue("ya29.fake-access-token");
  downloadDriveFileMock.mockResolvedValue(downloadedJpeg);
  fileTypeFromBufferMock.mockResolvedValue({ mime: "image/jpeg", ext: "jpg" });
  optimizeImageMock.mockResolvedValue({
    buffer: Buffer.from("optimized-bytes"),
    width: 1600,
    height: 1200,
    format: "webp",
  });
  generateBlurDataUrlMock.mockResolvedValue("data:image/webp;base64,blur");
  uploadFileMock.mockResolvedValue({
    path: "events/evt_1/galleries/gal_1/items/item_1/large.webp",
    publicUrl: "https://supabase.example/large.webp",
  });
});

// ---------------------------------------------------------------------------
// processItem
// ---------------------------------------------------------------------------

describe("processItem — happy path", () => {
  it("returns READY with all storage URLs + dimensions populated", async () => {
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("READY");
    if (result.outcome === "READY") {
      expect(result.data.publicUrl).toMatch(/^https:/);
      expect(result.data.width).toBe(1600);
      expect(result.data.height).toBe(1200);
      expect(result.data.blurDataUrl).toMatch(/^data:image\/webp/);
      expect(result.data.storageKey).toContain("events/evt_1/galleries/gal_1");
      expect(result.data.mimeType).toBe("image/webp");
    }
  });

  it("bakes EXIF orientation (autoOrient) and derives blur from the oriented large", async () => {
    await processItem(makeItem(), gallery, event);
    expect(optimizeImageMock).toHaveBeenCalledWith(
      downloadedJpeg.buffer,
      expect.objectContaining({ autoOrient: true }),
    );
    // Blur must come from the already-oriented large buffer, not the raw
    // download — else a portrait phone photo gets a landscape placeholder.
    expect(generateBlurDataUrlMock).toHaveBeenCalledWith(
      Buffer.from("optimized-bytes"),
    );
  });

  it("caps the lightbox large image at 2560px longest edge", async () => {
    // The worker must pass an explicit 2560 cap to optimizeImage rather than
    // letting it default to the 4000 max-dimension. This keeps mobile
    // lightboxes from over-fetching a ~4000px file while still covering the
    // Slideshow layout's full-bleed retina target. The actual resize is
    // covered by optimize-image.test.ts; here we assert the worker threads
    // the cap through.
    await processItem(makeItem(), gallery, event);
    expect(optimizeImageMock).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        maxWidth: 2560,
        maxHeight: 2560,
      }),
    );
  });
});

describe("processItem — error classification", () => {
  it("FAILED with SOURCE_FILE_NOT_FOUND when source_file_id is missing", async () => {
    const result = await processItem(
      { ...makeItem(), source_file_id: null },
      gallery,
      event,
    );
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.errorCode).toBe("SOURCE_FILE_NOT_FOUND");
    }
  });

  it("FAILED with RECONNECT_REQUIRED when token is revoked", async () => {
    getValidAccessTokenMock.mockRejectedValueOnce(
      new ProviderTokenRevokedErrorCls("revoked"),
    );
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.errorCode).toBe("RECONNECT_REQUIRED");
    }
  });

  it("FAILED (permanent) on Drive 404", async () => {
    downloadDriveFileMock.mockRejectedValueOnce(
      new GoogleDriveDownloadErrorCls(404, "SOURCE_FILE_NOT_FOUND"),
    );
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.errorCode).toBe("SOURCE_FILE_NOT_FOUND");
    }
  });

  it("RETRY on transient Drive failure", async () => {
    downloadDriveFileMock.mockRejectedValueOnce(
      new GoogleDriveDownloadErrorCls(0, "SOURCE_DOWNLOAD_FAILED", "fetch failed"),
    );
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("RETRY");
    if (result.outcome === "RETRY") {
      expect(result.errorCode).toBe("SOURCE_DOWNLOAD_FAILED");
    }
  });

  it("SKIPPED when magic-byte MIME isn't in the allowlist (HEIC, etc.)", async () => {
    fileTypeFromBufferMock.mockResolvedValueOnce({ mime: "image/heic", ext: "heic" });
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("SKIPPED");
    if (result.outcome === "SKIPPED") {
      expect(result.errorCode).toBe("UNSUPPORTED_MIME_TYPE");
    }
  });

  it("FAILED with FILE_TOO_LARGE when buffer exceeds the cap", async () => {
    downloadDriveFileMock.mockResolvedValueOnce({
      buffer: Buffer.alloc(11 * 1024 * 1024), // 11 MB
      mimeType: "image/jpeg",
    });
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.errorCode).toBe("FILE_TOO_LARGE");
    }
  });

  it("FAILED with FILE_TOO_LARGE when the provider rejects on Content-Length", async () => {
    // The provider's new Content-Length guard throws BEFORE the body is
    // read, so we never allocate the oversized buffer in memory.
    downloadDriveFileMock.mockRejectedValueOnce(
      new GoogleDriveDownloadErrorCls(200, "FILE_TOO_LARGE", "declared 50MB"),
    );
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("FAILED");
    if (result.outcome === "FAILED") {
      expect(result.errorCode).toBe("FILE_TOO_LARGE");
    }
  });

  it("RETRY with STORAGE_UPLOAD_FAILED when uploadFile returns { error }", async () => {
    uploadFileMock.mockResolvedValueOnce({ error: "Storage 500" });
    const result = await processItem(makeItem(), gallery, event);
    expect(result.outcome).toBe("RETRY");
    if (result.outcome === "RETRY") {
      expect(result.errorCode).toBe("STORAGE_UPLOAD_FAILED");
    }
  });
});

// ---------------------------------------------------------------------------
// persistOutcome
// ---------------------------------------------------------------------------

describe("persistOutcome", () => {
  it("writes READY + URLs and clears errorCode/lockedAt", async () => {
    await persistOutcome(makeItem(), {
      outcome: "READY",
      data: {
        publicUrl: "u",
        thumbnailUrl: "t",
        storageKey: "k",
        thumbnailKey: "tk",
        width: 1,
        height: 1,
        blurDataUrl: "b",
        sizeBytes: 1,
        mimeType: "image/webp",
      },
    });
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.status).toBe("READY");
    expect(update.data.errorCode).toBeNull();
    expect(update.data.lockedAt).toBeNull();
    expect(update.data.publicUrl).toBe("u");
  });

  const readyResult = {
    outcome: "READY",
    data: {
      publicUrl: "u",
      thumbnailUrl: "t",
      storageKey: "k",
      thumbnailKey: "tk",
      width: 1,
      height: 1,
      blurDataUrl: "b",
      sizeBytes: 1,
      mimeType: "image/webp",
    },
  } as const;

  it("fills alt from a descriptive original filename when alt is blank", async () => {
    await persistOutcome(
      makeItem({ original_name: "first-dance_golden-hour.jpg", alt: "" }),
      readyResult,
    );
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.alt).toBe("first dance golden hour");
  });

  it("leaves alt untouched for camera-generated filenames", async () => {
    await persistOutcome(
      makeItem({ original_name: "IMG_4021.JPG", alt: "" }),
      readyResult,
    );
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data).not.toHaveProperty("alt");
  });

  it("never overwrites an organizer-curated alt", async () => {
    await persistOutcome(
      makeItem({ original_name: "first-dance.jpg", alt: "The first dance" }),
      readyResult,
    );
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data).not.toHaveProperty("alt");
  });

  it("writes FAILED with errorCode for permanent errors", async () => {
    await persistOutcome(makeItem({ attempts: 1 }), {
      outcome: "FAILED",
      errorCode: "SOURCE_FILE_NOT_FOUND",
      errorMessage: "gone",
    });
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.status).toBe("FAILED");
    expect(update.data.errorCode).toBe("SOURCE_FILE_NOT_FOUND");
  });

  it("writes SKIPPED with errorCode for unsupported MIME", async () => {
    await persistOutcome(makeItem(), {
      outcome: "SKIPPED",
      errorCode: "UNSUPPORTED_MIME_TYPE",
      errorMessage: "heic",
    });
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.status).toBe("SKIPPED");
  });

  it("RETRY under the attempt cap drops back to PENDING and returns 'RETRY'", async () => {
    const ret = await persistOutcome(makeItem({ attempts: 1 }), {
      outcome: "RETRY",
      errorCode: "SOURCE_DOWNLOAD_FAILED",
      errorMessage: "transient",
    });
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.status).toBe("PENDING");
    expect(update.data.errorCode).toBe("SOURCE_DOWNLOAD_FAILED");
    // Regression: the function used to return "READY" here so the cron's
    // summary would lie (ready: N when items had actually retried). The
    // honest return value is "RETRY" so processGalleryImports counts it
    // into the retried bucket instead of ready.
    expect(ret).toBe("RETRY");
  });

  it("RETRY at/over the attempt cap becomes terminal FAILED and returns 'FAILED'", async () => {
    const ret = await persistOutcome(makeItem({ attempts: 3 }), {
      outcome: "RETRY",
      errorCode: "SOURCE_DOWNLOAD_FAILED",
      errorMessage: "transient",
    });
    const update = dbMock.eventGalleryItem.update.mock.calls[0][0];
    expect(update.data.status).toBe("FAILED");
    expect(ret).toBe("FAILED");
  });
});

// ---------------------------------------------------------------------------
// reconcileJobs
// ---------------------------------------------------------------------------

describe("reconcileJobs", () => {
  it("marks job COMPLETED + gallery READY when all items are READY", async () => {
    dbMock.galleryImportJob.findUnique.mockResolvedValueOnce({
      id: "job_1",
      galleryId: "gal_1",
      status: "PROCESSING",
      startedAt: new Date(),
    });
    dbMock.eventGalleryItem.groupBy.mockResolvedValueOnce([
      { status: "READY", _count: { _all: 5 } },
    ]);
    dbMock.eventGallery.findUnique.mockResolvedValueOnce({ status: "SYNCING" });

    await reconcileJobs(["job_1"]);

    const jobUpdate = dbMock.galleryImportJob.update.mock.calls[0][0];
    expect(jobUpdate.data.status).toBe("COMPLETED");
    expect(jobUpdate.data.processedItems).toBe(5);
    expect(jobUpdate.data.completedAt).toBeInstanceOf(Date);

    const galleryUpdate = dbMock.eventGallery.update.mock.calls[0][0];
    expect(galleryUpdate.data.status).toBe("READY");
  });

  it("marks job PARTIAL + gallery READY when some succeed and some fail", async () => {
    dbMock.galleryImportJob.findUnique.mockResolvedValueOnce({
      id: "job_1",
      galleryId: "gal_1",
      status: "PROCESSING",
      startedAt: new Date(),
    });
    dbMock.eventGalleryItem.groupBy.mockResolvedValueOnce([
      { status: "READY", _count: { _all: 3 } },
      { status: "FAILED", _count: { _all: 2 } },
    ]);
    dbMock.eventGallery.findUnique.mockResolvedValueOnce({ status: "SYNCING" });

    await reconcileJobs(["job_1"]);

    expect(dbMock.galleryImportJob.update.mock.calls[0][0].data.status).toBe("PARTIAL");
    expect(dbMock.eventGallery.update.mock.calls[0][0].data.status).toBe("READY");
  });

  it("marks job FAILED + gallery ERROR when every item failed", async () => {
    dbMock.galleryImportJob.findUnique.mockResolvedValueOnce({
      id: "job_1",
      galleryId: "gal_1",
      status: "PROCESSING",
      startedAt: new Date(),
    });
    dbMock.eventGalleryItem.groupBy.mockResolvedValueOnce([
      { status: "FAILED", _count: { _all: 4 } },
    ]);
    dbMock.eventGallery.findUnique.mockResolvedValueOnce({ status: "SYNCING" });

    await reconcileJobs(["job_1"]);

    expect(dbMock.galleryImportJob.update.mock.calls[0][0].data.status).toBe("FAILED");
    expect(dbMock.eventGallery.update.mock.calls[0][0].data.status).toBe("ERROR");
  });

  it("keeps job in PROCESSING + gallery in SYNCING while items remain pending", async () => {
    dbMock.galleryImportJob.findUnique.mockResolvedValueOnce({
      id: "job_1",
      galleryId: "gal_1",
      status: "QUEUED",
      startedAt: null,
    });
    dbMock.eventGalleryItem.groupBy.mockResolvedValueOnce([
      { status: "READY", _count: { _all: 2 } },
      { status: "PENDING", _count: { _all: 3 } },
    ]);
    dbMock.eventGallery.findUnique.mockResolvedValueOnce({ status: "DRAFT" });

    await reconcileJobs(["job_1"]);

    const jobUpdate = dbMock.galleryImportJob.update.mock.calls[0][0];
    expect(jobUpdate.data.status).toBe("PROCESSING");
    expect(jobUpdate.data.completedAt).toBeUndefined();
    expect(jobUpdate.data.startedAt).toBeInstanceOf(Date);

    const galleryUpdate = dbMock.eventGallery.update.mock.calls[0][0];
    expect(galleryUpdate.data.status).toBe("SYNCING");
  });

  it("never touches a PUBLISHED gallery's status", async () => {
    dbMock.galleryImportJob.findUnique.mockResolvedValueOnce({
      id: "job_1",
      galleryId: "gal_1",
      status: "PROCESSING",
      startedAt: new Date(),
    });
    dbMock.eventGalleryItem.groupBy.mockResolvedValueOnce([
      { status: "READY", _count: { _all: 5 } },
    ]);
    dbMock.eventGallery.findUnique.mockResolvedValueOnce({ status: "PUBLISHED" });

    await reconcileJobs(["job_1"]);

    // Job is reconciled, but the gallery update is NOT called.
    expect(dbMock.galleryImportJob.update).toHaveBeenCalledOnce();
    expect(dbMock.eventGallery.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// processGalleryImports (top-level) — exercise the no-work short-circuit
// ---------------------------------------------------------------------------

describe("processGalleryImports — empty queue", () => {
  it("returns zero counts with no DB writes when nothing is pending", async () => {
    // claimPendingItems uses $queryRaw which we haven't mocked; if nothing
    // is in the test DB it returns []. We override the worker's claim
    // function indirectly by mocking $queryRaw via the db mock.
    (dbMock as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw = vi
      .fn()
      .mockResolvedValueOnce([]);

    const summary = await processGalleryImports();
    expect(summary).toEqual({
      claimed: 0,
      ready: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      jobsReconciled: 0,
    });
    expect(dbMock.eventGalleryItem.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// processGalleryImports — self-heal bucket guard
// ---------------------------------------------------------------------------

describe("processGalleryImports — bucket guard", () => {
  it("ensures the bucket with the config.toml spec, then throws BEFORE claiming any items when it can't be created", async () => {
    // claimPendingItems runs via $queryRaw. We stub it so that IF it were
    // ever reached it would return a claimable item — but the assertion
    // below proves it is never called, because the bucket guard runs first.
    const queryRawMock = vi.fn().mockResolvedValue([
      { id: "item_1", gallery_id: "gal_1", source_file_id: "drive_1", attempts: 1 },
    ]);
    (dbMock as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw =
      queryRawMock;
    ensureBucketMock.mockResolvedValueOnce({
      success: false,
      error: "Bucket not found",
    });

    await expect(processGalleryImports()).rejects.toThrow(/bucket/i);

    // The guard requests the bucket with the exact spec mirrored from
    // supabase/config.toml [storage.buckets.gallery].
    expect(ensureBucketMock).toHaveBeenCalledWith("gallery", {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    // Ordering is the fix: the guard runs BEFORE claimPendingItems, so a
    // missing bucket never locks rows / burns their attempt budget and never
    // leaves a job stranded mid-reconcile. No claim, no downloads, no writes.
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(downloadDriveFileMock).not.toHaveBeenCalled();
    expect(uploadFileMock).not.toHaveBeenCalled();
    expect(dbMock.eventGalleryItem.update).not.toHaveBeenCalled();
  });
});
