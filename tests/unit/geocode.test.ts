import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __testing } from "@/lib/maps/geocode";

const { NoopGeocoder, LocationIQGeocoder } = __testing;

describe("NoopGeocoder", () => {
  it("returns an empty array regardless of query", async () => {
    const noop = new NoopGeocoder();
    expect(await noop.geocode()).toEqual([]);
  });

  it("reports provider = 'none'", () => {
    expect(new NoopGeocoder().provider).toBe("none");
  });
});

describe("LocationIQGeocoder", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("normalizes a single result into the GeocodeResult shape", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse([
        {
          place_id: "abc",
          lat: "43.6481",
          lon: "-79.3829",
          display_name: "100 King St W, Toronto, ON M5X 1A9, Canada",
          address: {
            house_number: "100",
            road: "King St W",
            city: "Toronto",
            state: "ON",
            postcode: "M5X 1A9",
            country: "Canada",
          },
        },
      ])
    );

    const geocoder = new LocationIQGeocoder("test-key");
    const results = await geocoder.geocode("100 King St W");

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      formattedAddress: "100 King St W, Toronto, ON M5X 1A9, Canada",
      latitude: 43.6481,
      longitude: -79.3829,
      placeId: "abc",
      provider: "locationiq",
      addressLine1: "100 King St W",
      city: "Toronto",
      region: "ON",
      postalCode: "M5X 1A9",
      country: "Canada",
    });
  });

  it("falls back to town/village when city is absent", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse([
        {
          lat: "0",
          lon: "0",
          display_name: "Somewhere",
          address: { village: "Tinytown" },
        },
      ])
    );
    const results = await new LocationIQGeocoder("k").geocode("query");
    expect(results[0].city).toBe("Tinytown");
  });

  it("treats a 404 as an empty-result match, not an error", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ error: "Not Found" }, 404));
    const results = await new LocationIQGeocoder("k").geocode("nowhere");
    expect(results).toEqual([]);
  });

  it("throws on non-404 error responses", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ error: "Server error" }, 500));
    await expect(new LocationIQGeocoder("k").geocode("x")).rejects.toThrow(/500/);
  });

  it("passes biasCountry as the countrycodes param", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse([]));
    await new LocationIQGeocoder("k").geocode("x", { biasCountry: "CA" });
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("countrycodes=ca");
  });

  it("caps results via limit param", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse([]));
    await new LocationIQGeocoder("k").geocode("x", { limit: 3 });
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=3");
  });
});
