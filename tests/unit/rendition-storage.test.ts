import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the two collaborators: the sharp-backed generator and the storage
// upload. We assert the orchestration (generate -> upload each rung -> report
// generated vs uploaded widths), not the real image encoding.
// ---------------------------------------------------------------------------

const generateRenditionsMock = vi.fn();
vi.mock("@/lib/media-validation", () => ({
  generateRenditions: generateRenditionsMock,
}));

const uploadFileMock = vi.fn();
vi.mock("@/lib/supabase-storage", () => ({
  uploadFile: uploadFileMock,
  // Faithful to the real insertRenditionWidth naming so path assertions are real.
  getRenditionPath: (path: string, w: number) =>
    path.replace(/\.webp$/i, `_w${w}.webp`),
}));

const { uploadRenditions, renditionSiblingPaths } = await import(
  "@/lib/images/rendition-storage"
);

const BASE = "evt_1/gallery/123.webp";

beforeEach(() => {
  vi.clearAllMocks();
  uploadFileMock.mockResolvedValue({ publicUrl: "https://cdn/x.webp" });
});

describe("renditionSiblingPaths", () => {
  it("maps widths to _w{width}.webp siblings and accepts a Set", () => {
    expect(renditionSiblingPaths(BASE, [384, 1200])).toEqual([
      "evt_1/gallery/123_w384.webp",
      "evt_1/gallery/123_w1200.webp",
    ]);
    // De-duped Set input works (used by the DELETE union cleanup).
    expect(renditionSiblingPaths(BASE, new Set([640, 640]))).toEqual([
      "evt_1/gallery/123_w640.webp",
    ]);
  });
});

describe("uploadRenditions", () => {
  it("generates the ladder, uploads each rung, and reports generated + uploaded widths", async () => {
    generateRenditionsMock.mockResolvedValue([
      { width: 384, buffer: Buffer.from("a") },
      { width: 640, buffer: Buffer.from("b") },
      { width: 1200, buffer: Buffer.from("c") },
    ]);

    const result = await uploadRenditions({
      bucket: "event-assets",
      basePath: BASE,
      buffer: Buffer.from("orig"),
      widths: [384, 640, 1200],
    });

    expect(result.generatedWidths).toEqual([384, 640, 1200]);
    expect(result.uploadedWidths).toEqual([384, 640, 1200]);
    // Uploaded to the correct sibling path per rung.
    expect(uploadFileMock).toHaveBeenCalledWith(
      "event-assets",
      "evt_1/gallery/123_w640.webp",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/webp" })
    );
  });

  it("excludes a rung whose upload failed (best-effort) from uploadedWidths", async () => {
    generateRenditionsMock.mockResolvedValue([
      { width: 384, buffer: Buffer.from("a") },
      { width: 640, buffer: Buffer.from("b") },
    ]);
    // 640 fails to upload.
    uploadFileMock.mockImplementation(async (_b: string, path: string) =>
      path.includes("_w640") ? { error: "storage 500" } : { publicUrl: "ok" }
    );

    const result = await uploadRenditions({
      bucket: "event-assets",
      basePath: BASE,
      buffer: Buffer.from("orig"),
      widths: [384, 640],
    });

    // The caller compares these two lengths to detect a partial upload.
    expect(result.generatedWidths).toEqual([384, 640]);
    expect(result.uploadedWidths).toEqual([384]);
  });

  it("passes upsert through only when requested (backfill re-runs)", async () => {
    generateRenditionsMock.mockResolvedValue([
      { width: 384, buffer: Buffer.from("a") },
    ]);

    await uploadRenditions({
      bucket: "event-assets",
      basePath: BASE,
      buffer: Buffer.from("orig"),
      widths: [384],
      upsert: true,
    });
    expect(uploadFileMock).toHaveBeenCalledWith(
      "event-assets",
      "evt_1/gallery/123_w384.webp",
      expect.any(Buffer),
      expect.objectContaining({ upsert: true })
    );

    uploadFileMock.mockClear();

    await uploadRenditions({
      bucket: "event-assets",
      basePath: BASE,
      buffer: Buffer.from("orig"),
      widths: [384],
    });
    // Ingestion (no upsert): the option must be absent, not false.
    const opts = uploadFileMock.mock.calls[0][3];
    expect(opts).not.toHaveProperty("upsert");
  });

  it("returns empty widths when the source is too small for any rung", async () => {
    generateRenditionsMock.mockResolvedValue([]);
    const result = await uploadRenditions({
      bucket: "event-assets",
      basePath: BASE,
      buffer: Buffer.from("tiny"),
      widths: [384, 640, 1200],
    });
    expect(result.generatedWidths).toEqual([]);
    expect(result.uploadedWidths).toEqual([]);
    expect(uploadFileMock).not.toHaveBeenCalled();
  });
});
