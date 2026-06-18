import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

/**
 * Regression guard for the media DELETE route's cover-clear (issue #211).
 *
 * A media asset chosen as an event cover can be ANY kind: CoverImagePicker lists
 * every kind from GET /media and `resolveCoverMediaAssetId` has no kind filter,
 * so a GALLERY photo can become `Event.coverMediaAssetId`. Deleting it must clear
 * the cover pair — the FK's `onDelete: SetNull` alone nulls `coverMediaAssetId`
 * but leaves the denormalized `coverImageUrl` pointing at a now-deleted storage
 * object (a broken public cover). A previous `if (asset.kind === "HERO")` gate
 * skipped the clear for galleries; this test fails if that gate comes back.
 */

const dbMock = {
  mediaAsset: { findFirst: vi.fn() },
  event: { findUnique: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const verifyAuthMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: verifyAuthMock }));

const assertCanMutateMock = vi.fn();
const canUploadMediaMock = vi.fn();
vi.mock("@/lib/authorization", () => ({
  assertCanMutate: assertCanMutateMock,
  canUploadMedia: canUploadMediaMock,
}));

const clearEventCoversForAssetsMock = vi.fn();
vi.mock("@/lib/cover-media-asset", () => ({
  clearEventCoversForAssets: clearEventCoversForAssetsMock,
}));

const deleteFileMock = vi.fn();
vi.mock("@/lib/supabase-storage", () => ({
  uploadFile: vi.fn(),
  deleteFile: deleteFileMock,
  BUCKETS: { eventAssets: "event-assets" },
  getEventAssetPath: vi.fn(),
  getRenditionPath: (path: string, w: number) =>
    path.replace(/\.webp$/i, `_w${w}.webp`),
  ensureBucket: vi.fn(),
}));

const revalidateEventPageMock = vi.fn();
vi.mock("@/lib/revalidation", () => ({
  revalidateEventPage: revalidateEventPageMock,
}));

const { DELETE } = await import("@/app/api/events/[id]/media/route");

function makeRequest(assetId: string): NextRequest {
  return new NextRequest("https://example.com/api/events/evt_1/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
}

const ctx = { params: Promise.resolve({ id: "evt_1" }) };

function makeAsset(kind: "HERO" | "GALLERY") {
  return {
    id: `asset_${kind}`,
    eventId: "evt_1",
    kind,
    bucket: "event-assets",
    path: `evt_1/${kind === "HERO" ? "hero" : "gallery"}/1.webp`,
    renditionWidths: [] as number[],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyAuthMock.mockResolvedValue({ id: "user_1", status: "ACTIVE" });
  assertCanMutateMock.mockReturnValue(undefined);
  canUploadMediaMock.mockResolvedValue({ allowed: true });
  // $transaction(cb) invokes the callback with a tx whose event has no
  // pageConfig (so the config-cleanup branch is skipped) and a no-op delete.
  dbMock.$transaction.mockImplementation(
    async (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const tx = {
        event: {
          findUnique: vi.fn().mockResolvedValue({ pageConfig: null }),
          update: vi.fn(),
        },
        mediaAsset: { delete: vi.fn().mockResolvedValue({}) },
      } as unknown as Prisma.TransactionClient;
      return cb(tx);
    }
  );
  dbMock.event.findUnique.mockResolvedValue({ slug: "e", status: "DRAFT" });
  deleteFileMock.mockResolvedValue({});
});

describe("DELETE /api/events/[id]/media — cover-clear runs for every kind", () => {
  it("clears the cover pair when deleting a GALLERY asset", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue(makeAsset("GALLERY"));

    const res = await DELETE(makeRequest("asset_GALLERY"), ctx);

    expect(res.status).toBe(200);
    expect(clearEventCoversForAssetsMock).toHaveBeenCalledWith(
      expect.anything(),
      ["asset_GALLERY"]
    );
  });

  it("still clears the cover pair when deleting a HERO asset", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue(makeAsset("HERO"));

    const res = await DELETE(makeRequest("asset_HERO"), ctx);

    expect(res.status).toBe(200);
    expect(clearEventCoversForAssetsMock).toHaveBeenCalledWith(
      expect.anything(),
      ["asset_HERO"]
    );
  });
});
