import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { RESPONSIVE_RENDITION_WIDTHS } from "@/schemas/media-asset";

/**
 * Regression guard for the media POST route's responsive-rendition job
 * (issue #211 / PR #227).
 *
 * #227 UN-gated the `after()` rendition generation so it runs for BOTH kinds —
 * previously it was effectively HERO-only, leaving template galleries with no
 * ladder. This test fails if a `kind === "HERO"` gate ever creeps back around
 * the generation, which would silently strip galleries of their renditions
 * (they'd serve only the ≤4000px original) with nothing else catching it.
 *
 * `after()` is captured via vi.hoisted and run explicitly after POST returns,
 * so the deferred job is deterministic in the test.
 */

const afterHook = vi.hoisted(() => {
  const callbacks: Array<() => unknown> = [];
  return {
    callbacks,
    capture: (cb: () => unknown) => {
      callbacks.push(cb);
    },
    async run() {
      for (const cb of callbacks) await cb();
    },
  };
});
vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return { ...actual, after: afterHook.capture };
});

const dbMock = {
  mediaAsset: {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  event: { findUnique: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

vi.mock("@/lib/authorization", () => ({
  assertCanMutate: vi.fn(),
  canUploadMedia: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/media-validation", () => ({
  validateUploadedImage: vi.fn(async () => ({ valid: true })),
  optimizeImage: vi.fn(async () => ({
    buffer: Buffer.from("optimized"),
    width: 3000,
    height: 2000,
    format: "webp",
  })),
  generateBlurDataUrl: vi.fn(async () => "data:image/webp;base64,blur"),
}));

vi.mock("@/lib/supabase-storage", () => ({
  uploadFile: vi.fn(async () => ({ publicUrl: "https://cdn/x.webp" })),
  deleteFile: vi.fn(),
  ensureBucket: vi.fn(),
  getEventAssetPath: (eventId: string, type: string, filename: string) =>
    `${eventId}/${type}/${filename}`,
  BUCKETS: { eventAssets: "event-assets" },
}));

const uploadRenditionsMock = vi.fn();
vi.mock("@/lib/images/rendition-storage", () => ({
  uploadRenditions: uploadRenditionsMock,
  renditionSiblingPaths: vi.fn(() => []),
}));

vi.mock("@/lib/revalidation", () => ({ revalidateEventPage: vi.fn() }));

const { POST } = await import("@/app/api/events/[id]/media/route");

const ctx = { params: Promise.resolve({ id: "evt_1" }) };

function makeRequest(tags: string[]): NextRequest {
  const fd = new FormData();
  fd.set("file", new File([Buffer.from("rawbytes")], "x.webp", { type: "image/webp" }));
  fd.set("tags", JSON.stringify(tags));
  fd.set("alt", "a photo");
  return new NextRequest("https://example.com/api/events/evt_1/media", {
    method: "POST",
    body: fd,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterHook.callbacks.length = 0;
  verifyAuthMock.mockResolvedValue({ id: "user_1", status: "ACTIVE" });
  dbMock.mediaAsset.count.mockResolvedValue(0);
  dbMock.mediaAsset.create.mockImplementation(async ({ data }: { data: { kind: string } }) => ({
    id: "asset_1",
    kind: data.kind,
  }));
  dbMock.event.findUnique.mockResolvedValue({ slug: "e", status: "DRAFT" });
  uploadRenditionsMock.mockResolvedValue({
    generatedWidths: [...RESPONSIVE_RENDITION_WIDTHS],
    uploadedWidths: [...RESPONSIVE_RENDITION_WIDTHS],
  });
});

describe("POST /api/events/[id]/media — renditions generate for every kind", () => {
  it("generates renditions + persists renditionWidths for a GALLERY upload", async () => {
    const res = await POST(makeRequest(["gallery"]), ctx);
    expect(res.status).toBeLessThan(300);

    // Deferred job hasn't run until we drain after().
    expect(uploadRenditionsMock).not.toHaveBeenCalled();
    await afterHook.run();

    expect(uploadRenditionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "event-assets",
        basePath: expect.stringContaining("evt_1/gallery/"),
        widths: RESPONSIVE_RENDITION_WIDTHS,
      })
    );
    expect(dbMock.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: "asset_1" },
      data: { renditionWidths: [...RESPONSIVE_RENDITION_WIDTHS] },
    });
  });

  it("still generates renditions for a HERO upload (un-gated, symmetric)", async () => {
    await POST(makeRequest(["hero"]), ctx);
    await afterHook.run();

    expect(uploadRenditionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining("evt_1/hero/"),
        widths: RESPONSIVE_RENDITION_WIDTHS,
      })
    );
    expect(dbMock.mediaAsset.update).toHaveBeenCalledOnce();
  });

  it("skips the renditionWidths write when no rung uploaded (tiny source)", async () => {
    uploadRenditionsMock.mockResolvedValueOnce({
      generatedWidths: [],
      uploadedWidths: [],
    });
    await POST(makeRequest(["gallery"]), ctx);
    await afterHook.run();

    expect(uploadRenditionsMock).toHaveBeenCalledOnce();
    expect(dbMock.mediaAsset.update).not.toHaveBeenCalled();
  });
});
