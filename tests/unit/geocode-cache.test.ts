import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = {
  geocodeCache: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  geocodeUsage: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const {
  buildCacheKey,
  readCache,
  writeCache,
  checkDailyBudget,
  incrementTodayUsage,
  getTodayUsage,
  DAILY_BUDGET_FLOOR,
  __testing,
} = await import("@/lib/maps/geocode-cache");

beforeEach(() => {
  vi.clearAllMocks();
  __testing.lru.clear();
});

const sampleResult = [
  {
    formattedAddress: "100 King St W, Toronto",
    latitude: 43.6481,
    longitude: -79.3829,
    provider: "locationiq" as const,
  },
];

describe("buildCacheKey", () => {
  it("folds whitespace + case so equivalent queries hash the same", () => {
    const a = buildCacheKey({ query: "  100 King   St W  ", provider: "locationiq" });
    const b = buildCacheKey({ query: "100 KING ST W", provider: "locationiq" });
    expect(a).toBe(b);
  });

  it("varies the key when provider differs", () => {
    const a = buildCacheKey({ query: "x", provider: "locationiq" });
    const b = buildCacheKey({ query: "x", provider: "mapbox" });
    expect(a).not.toBe(b);
  });

  it("varies the key when biasCountry differs", () => {
    const a = buildCacheKey({ query: "x", provider: "locationiq", biasCountry: "ca" });
    const b = buildCacheKey({ query: "x", provider: "locationiq", biasCountry: "us" });
    expect(a).not.toBe(b);
  });
});

describe("readCache / writeCache", () => {
  it("returns null when both LRU and DB miss", async () => {
    dbMock.geocodeCache.findUnique.mockResolvedValueOnce(null);
    const result = await readCache("key1");
    expect(result).toBeNull();
  });

  it("serves from LRU after a write without hitting the DB", async () => {
    dbMock.geocodeCache.upsert.mockResolvedValueOnce({});
    await writeCache({ key: "key2", provider: "locationiq", result: sampleResult });

    const result = await readCache("key2");
    expect(result).toEqual(sampleResult);
    expect(dbMock.geocodeCache.findUnique).not.toHaveBeenCalled();
  });

  it("hydrates the LRU from a DB hit", async () => {
    dbMock.geocodeCache.findUnique.mockResolvedValueOnce({
      key: "key3",
      provider: "locationiq",
      response: sampleResult,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      createdAt: new Date(),
    });

    const first = await readCache("key3");
    expect(first).toEqual(sampleResult);

    const second = await readCache("key3");
    expect(second).toEqual(sampleResult);
    // Only the first read hit the DB.
    expect(dbMock.geocodeCache.findUnique).toHaveBeenCalledTimes(1);
  });

  it("treats expired DB rows as misses and deletes them", async () => {
    dbMock.geocodeCache.findUnique.mockResolvedValueOnce({
      key: "key4",
      provider: "locationiq",
      response: sampleResult,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });
    dbMock.geocodeCache.delete.mockResolvedValueOnce({});

    const result = await readCache("key4");
    expect(result).toBeNull();
    expect(dbMock.geocodeCache.delete).toHaveBeenCalledWith({ where: { key: "key4" } });
  });
});

describe("checkDailyBudget + incrementTodayUsage", () => {
  it("allows when no usage recorded today", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce(null);
    expect(await checkDailyBudget()).toEqual({ allowed: true });
  });

  it("allows when today's count is under the floor", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce({
      date: __testing.todayKey(),
      count: DAILY_BUDGET_FLOOR - 1,
      updatedAt: new Date(),
    });
    expect(await checkDailyBudget()).toEqual({ allowed: true });
  });

  it("refuses at the floor", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce({
      date: __testing.todayKey(),
      count: DAILY_BUDGET_FLOOR,
      updatedAt: new Date(),
    });
    const result = await checkDailyBudget();
    expect(result).toEqual({ allowed: false, todayCount: DAILY_BUDGET_FLOOR });
  });

  it("upserts the daily usage row on increment", async () => {
    dbMock.geocodeUsage.upsert.mockResolvedValueOnce({});
    await incrementTodayUsage();
    expect(dbMock.geocodeUsage.upsert).toHaveBeenCalledWith({
      where: { date: __testing.todayKey() },
      create: { date: __testing.todayKey(), count: 1 },
      update: { count: { increment: 1 } },
    });
  });

  it("reads the recorded count for the day", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce({
      date: __testing.todayKey(),
      count: 42,
      updatedAt: new Date(),
    });
    expect(await getTodayUsage()).toBe(42);
  });
});
