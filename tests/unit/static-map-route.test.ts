import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const dbMock = {
  geocodeUsage: { findUnique: vi.fn(), upsert: vi.fn() },
};
vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("@/env", () => ({
  env: {
    GEOCODER_PROVIDER: "locationiq",
    LOCATIONIQ_API_KEY: "pk.test",
  },
}));

const checkUpstashLimitMock = vi.fn(async () => true);
vi.mock("@/lib/rate-limit", () => ({
  upstashLimiter: vi.fn(() => null),
  checkUpstashLimit: checkUpstashLimitMock,
  getClientIp: vi.fn(() => "203.0.113.42"),
  ipKey: vi.fn((ip: string) => ip),
  hashedIpKey: vi.fn(() => "hashed"),
}));

const { GET } = await import("@/app/api/maps/static/route");

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  checkUpstashLimitMock.mockResolvedValue(true);
  dbMock.geocodeUsage.findUnique.mockResolvedValue(null);
  dbMock.geocodeUsage.upsert.mockResolvedValue({});
  fetchSpy = vi.spyOn(global, "fetch");
});

function makeRequest(query: string): NextRequest {
  return new NextRequest(`https://example.com/api/maps/static?${query}`, {
    method: "GET",
  });
}

const mockPngResponse = () =>
  new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });

describe("GET /api/maps/static", () => {
  it("returns 400 on missing required params", async () => {
    const res = await GET(makeRequest("lat=43.65"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on out-of-range lat", async () => {
    const res = await GET(makeRequest("lat=91&lng=0"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on out-of-range size", async () => {
    const res = await GET(makeRequest("lat=43.65&lng=-79.38&w=10000&h=10000"));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    checkUpstashLimitMock.mockResolvedValueOnce(false);
    const res = await GET(makeRequest("lat=43.65&lng=-79.38"));
    expect(res.status).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 when the daily budget is exhausted", async () => {
    dbMock.geocodeUsage.findUnique.mockResolvedValueOnce({
      date: new Date(),
      count: 4_000,
      updatedAt: new Date(),
    });
    const res = await GET(makeRequest("lat=43.65&lng=-79.38"));
    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies the LocationIQ response on success", async () => {
    fetchSpy.mockResolvedValueOnce(mockPngResponse());
    const res = await GET(makeRequest("lat=43.65&lng=-79.38"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/^image\/png/);
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=2592000/);
    expect(res.headers.get("Cache-Control")).toMatch(/immutable/);
    expect(dbMock.geocodeUsage.upsert).toHaveBeenCalled();
  });

  it("hits LocationIQ with the API key in the upstream URL only", async () => {
    fetchSpy.mockResolvedValueOnce(mockPngResponse());
    await GET(makeRequest("lat=43.65&lng=-79.38&w=1200&h=630&z=15"));
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("maps.locationiq.com/v3/staticmap");
    expect(calledUrl).toContain("key=pk.test");
    // URLSearchParams encodes the comma as %2C, which LocationIQ accepts.
    expect(calledUrl).toMatch(/center=43\.65(%2C|,)-79\.38/);
    expect(calledUrl).toContain("size=1200x630");
    expect(calledUrl).toContain("zoom=15");
  });

  it("returns 502 on upstream non-OK response", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Error", { status: 500 }));
    const res = await GET(makeRequest("lat=43.65&lng=-79.38"));
    expect(res.status).toBe(502);
    expect(dbMock.geocodeUsage.upsert).not.toHaveBeenCalled();
  });
});
