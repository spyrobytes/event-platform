import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  mediaAsset: { findFirst: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { resolveCoverMediaAssetId } = await import("@/lib/cover-media-asset");

beforeEach(() => {
  vi.resetAllMocks();
});

const URL =
  "https://x.supabase.co/storage/v1/object/public/event-assets/e/1/123.webp";

describe("resolveCoverMediaAssetId", () => {
  it("returns null without querying for an empty cover", async () => {
    expect(await resolveCoverMediaAssetId(null)).toBeNull();
    expect(await resolveCoverMediaAssetId(undefined)).toBeNull();
    expect(await resolveCoverMediaAssetId("")).toBeNull();
    expect(dbMock.mediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("returns the asset id when the cover URL matches an uploaded asset", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue({ id: "asset_1" });
    expect(await resolveCoverMediaAssetId(URL)).toBe("asset_1");
    expect(dbMock.mediaAsset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { publicUrl: URL } })
    );
  });

  it("returns null when no asset matches (pasted external URL)", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue(null);
    expect(await resolveCoverMediaAssetId("https://external.com/x.jpg")).toBeNull();
  });
});
