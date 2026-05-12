import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const dbMock = {
  event: { findUnique: vi.fn() },
  geocodeCache: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
  geocodeUsage: { findUnique: vi.fn(), upsert: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ verifyAuth: authMock }));
vi.mock("@/lib/authorization", () => ({
  requireEventOwner: vi.fn(async () => undefined),
}));
vi.mock("@/lib/rate-limit", () => ({
  upstashLimiter: vi.fn(() => null),
  checkUpstashLimit: vi.fn(async () => true),
}));

const geocodeMock = vi.fn();
vi.mock("@/lib/maps/geocode", () => ({
  getGeocoder: () => ({ provider: "locationiq", geocode: geocodeMock }),
}));

const { POST } = await import("@/app/api/events/[id]/location/geocode/route");
const { __testing: cacheTesting } = await import("@/lib/maps/geocode-cache");

beforeEach(() => {
  vi.clearAllMocks();
  // Module-level LRU in geocode-cache leaks across tests otherwise.
  cacheTesting.lru.clear();
  authMock.mockResolvedValue({ id: "user_1", roles: ["organizer"] });
  dbMock.event.findUnique.mockResolvedValue({ organizationId: "org_1" });
  dbMock.geocodeCache.findUnique.mockResolvedValue(null);
  dbMock.geocodeUsage.findUnique.mockResolvedValue(null);
  dbMock.geocodeCache.upsert.mockResolvedValue({});
  dbMock.geocodeUsage.upsert.mockResolvedValue({});
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/events/evt_1/location/geocode", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleCandidate = {
  formattedAddress: "100 King St W, Toronto",
  latitude: 43.6481,
  longitude: -79.3829,
  provider: "locationiq",
};

describe("POST /api/events/[id]/location/geocode", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ query: "Toronto" }), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (too short)", async () => {
    const res = await POST(makeRequest({ query: "xy" }), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(400);
  });

  it("calls the geocoder and caches results on a fresh query", async () => {
    geocodeMock.mockResolvedValueOnce([sampleCandidate]);

    const res = await POST(makeRequest({ query: "100 King St W" }), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.results).toEqual([sampleCandidate]);
    expect(body.data.cached).toBe(false);
    expect(geocodeMock).toHaveBeenCalledTimes(1);
    expect(dbMock.geocodeCache.upsert).toHaveBeenCalledTimes(1);
    expect(dbMock.geocodeUsage.upsert).toHaveBeenCalledTimes(1);
  });

  it("serves the cached path without hitting the geocoder", async () => {
    dbMock.geocodeCache.findUnique.mockResolvedValueOnce({
      key: "x",
      provider: "locationiq",
      response: [sampleCandidate],
      expiresAt: new Date(Date.now() + 1000 * 60),
      createdAt: new Date(),
    });

    const res = await POST(makeRequest({ query: "100 King St W" }), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.cached).toBe(true);
    expect(geocodeMock).not.toHaveBeenCalled();
    expect(dbMock.geocodeUsage.upsert).not.toHaveBeenCalled();
  });

  it("returns 503 when the daily budget is exhausted", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce({
      date: new Date(),
      count: 4_000,
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest({ query: "Toronto" }), {
      params: Promise.resolve({ id: "evt_1" }),
    });
    expect(res.status).toBe(503);
    expect(geocodeMock).not.toHaveBeenCalled();
  });
});
