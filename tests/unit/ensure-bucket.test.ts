import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Mock the Supabase client surface ensureBucket touches: storage.getBucket /
// storage.createBucket. getStorageClient() caches a singleton, but it holds
// these same module-level mocks, so reconfiguring them per test is enough.
const getBucketMock = vi.fn();
const createBucketMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: { getBucket: getBucketMock, createBucket: createBucketMock },
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const { ensureBucket } = await import("@/lib/supabase-storage");

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so each test starts with no implementation
  // and sets exactly the getBucket/createBucket behavior it needs.
  vi.resetAllMocks();
});

describe("ensureBucket", () => {
  it("returns success and does not create when the bucket already exists", async () => {
    getBucketMock.mockResolvedValue({ data: { name: "gallery" }, error: null });

    const res = await ensureBucket("gallery", { public: true });

    expect(res).toEqual({ success: true });
    expect(createBucketMock).not.toHaveBeenCalled();
  });

  it("creates the bucket with the passed spec when missing", async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });
    createBucketMock.mockResolvedValue({ data: { name: "gallery" }, error: null });

    const res = await ensureBucket("gallery", {
      public: true,
      fileSizeLimit: 52_428_800,
      allowedMimeTypes: ["image/webp"],
    });

    expect(res).toEqual({ success: true });
    expect(createBucketMock).toHaveBeenCalledWith("gallery", {
      public: true,
      fileSizeLimit: 52_428_800,
      allowedMimeTypes: ["image/webp"],
    });
  });

  it("treats an 'already exists' create error as success (create race)", async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });
    createBucketMock.mockResolvedValue({
      data: null,
      error: { message: "The resource already exists" },
    });

    const res = await ensureBucket("gallery");

    expect(res.success).toBe(true);
  });

  it("does not false-fail: re-checks existence when create errors but the bucket is actually present (transient getBucket)", async () => {
    // getBucket #1: transient error → looks missing. createBucket: transient
    // error (not "already exists"). getBucket #2 (re-check): bucket is really
    // there → success, no false failure.
    getBucketMock
      .mockResolvedValueOnce({ data: null, error: { message: "503 Service Unavailable" } })
      .mockResolvedValueOnce({ data: { name: "gallery" }, error: null });
    createBucketMock.mockResolvedValue({
      data: null,
      error: { message: "503 Service Unavailable" },
    });

    const res = await ensureBucket("gallery");

    expect(res).toEqual({ success: true });
    expect(getBucketMock).toHaveBeenCalledTimes(2);
  });

  it("returns failure when the bucket is genuinely absent and cannot be created", async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });
    createBucketMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const res = await ensureBucket("gallery");

    expect(res.success).toBe(false);
    expect(res.error).toContain("permission denied");
  });

  it("defaults public to true when no options are passed (event-assets back-compat)", async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });
    createBucketMock.mockResolvedValue({
      data: { name: "event-assets" },
      error: null,
    });

    await ensureBucket("event-assets");

    expect(createBucketMock).toHaveBeenCalledWith("event-assets", { public: true });
  });
});
