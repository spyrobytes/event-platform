import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  mediaAsset: { findFirst: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const { resolveCoverMediaAssetId, coverMediaAssetUpdate } = await import(
  "@/lib/cover-media-asset"
);

beforeEach(() => {
  vi.resetAllMocks();
});

const EVENT = "evt_1";
const URL =
  "https://x.supabase.co/storage/v1/object/public/event-assets/evt_1/hero/123.webp";

describe("resolveCoverMediaAssetId", () => {
  it("returns null without querying for an empty cover", async () => {
    expect(await resolveCoverMediaAssetId(EVENT, null)).toBeNull();
    expect(await resolveCoverMediaAssetId(EVENT, undefined)).toBeNull();
    expect(await resolveCoverMediaAssetId(EVENT, "")).toBeNull();
    expect(dbMock.mediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the event + URL and returns the asset id", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue({ id: "asset_1" });
    expect(await resolveCoverMediaAssetId(EVENT, URL)).toBe("asset_1");
    expect(dbMock.mediaAsset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: EVENT, publicUrl: URL },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("returns null when no asset of this event matches the URL", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue(null);
    expect(await resolveCoverMediaAssetId(EVENT, URL)).toBeNull();
  });
});

describe("coverMediaAssetUpdate (update-handler contract)", () => {
  it("returns {} (FK untouched) when the cover is omitted from the update", async () => {
    expect(await coverMediaAssetUpdate(EVENT, undefined)).toEqual({});
    expect(dbMock.mediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("clears the FK (null) when the cover is cleared with '' or null", async () => {
    expect(await coverMediaAssetUpdate(EVENT, "")).toEqual({
      coverMediaAssetId: null,
    });
    expect(await coverMediaAssetUpdate(EVENT, null)).toEqual({
      coverMediaAssetId: null,
    });
    expect(dbMock.mediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("resolves the FK when the cover is set to an asset URL", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue({ id: "asset_1" });
    expect(await coverMediaAssetUpdate(EVENT, URL)).toEqual({
      coverMediaAssetId: "asset_1",
    });
  });

  it("sets the FK to null when the cover URL matches no asset (pasted external)", async () => {
    dbMock.mediaAsset.findFirst.mockResolvedValue(null);
    expect(await coverMediaAssetUpdate(EVENT, "https://external.com/x.jpg")).toEqual({
      coverMediaAssetId: null,
    });
  });
});
