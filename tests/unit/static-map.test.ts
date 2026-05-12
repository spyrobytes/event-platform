import { describe, it, expect } from "vitest";
import {
  getStaticMapImageUrl,
  getAbsoluteStaticMapImageUrl,
} from "@/lib/maps/static-map";

describe("getStaticMapImageUrl", () => {
  it("returns null when coordinates are absent", () => {
    expect(getStaticMapImageUrl({ formattedAddress: "X" })).toBeNull();
    expect(getStaticMapImageUrl({ latitude: 43.65 })).toBeNull();
  });

  it("returns null for out-of-range coords (validation guards)", () => {
    expect(getStaticMapImageUrl({ latitude: 91, longitude: 0 })).toBeNull();
    expect(getStaticMapImageUrl({ latitude: 0, longitude: 181 })).toBeNull();
  });

  it("builds a proxy URL with coords + defaults", () => {
    const url = getStaticMapImageUrl({ latitude: 43.6481, longitude: -79.3829 });
    expect(url).not.toBeNull();
    expect(url).toMatch(/^\/api\/maps\/static\?/);
    expect(url).toContain("lat=43.6481");
    expect(url).toContain("lng=-79.3829");
    expect(url).toContain("w=600");
    expect(url).toContain("h=400");
    expect(url).toContain("z=15");
  });

  it("respects explicit width/height/zoom options", () => {
    const url = getStaticMapImageUrl(
      { latitude: 0, longitude: 0 },
      { width: 1200, height: 630, zoom: 17 }
    );
    expect(url).toContain("w=1200");
    expect(url).toContain("h=630");
    expect(url).toContain("z=17");
  });

  it("uses location.zoom when no explicit option is provided", () => {
    const url = getStaticMapImageUrl({
      latitude: 0,
      longitude: 0,
      zoom: 12,
    });
    expect(url).toContain("z=12");
  });

  it("prefers explicit zoom over location.zoom", () => {
    const url = getStaticMapImageUrl(
      { latitude: 0, longitude: 0, zoom: 12 },
      { zoom: 18 }
    );
    expect(url).toContain("z=18");
  });

  it("works for (0, 0) coords", () => {
    const url = getStaticMapImageUrl({ latitude: 0, longitude: 0 });
    expect(url).toContain("lat=0");
    expect(url).toContain("lng=0");
  });
});

describe("getAbsoluteStaticMapImageUrl", () => {
  it("returns null when coords are absent", () => {
    expect(
      getAbsoluteStaticMapImageUrl({ formattedAddress: "X" }, "https://example.com")
    ).toBeNull();
  });

  it("prepends the base URL origin", () => {
    expect(
      getAbsoluteStaticMapImageUrl(
        { latitude: 43.6481, longitude: -79.3829 },
        "https://eventfxr.com"
      )
    ).toMatch(/^https:\/\/eventfxr\.com\/api\/maps\/static\?/);
  });

  it("trims trailing slashes on the base URL", () => {
    expect(
      getAbsoluteStaticMapImageUrl(
        { latitude: 0, longitude: 0 },
        "https://eventfxr.com//"
      )
    ).toMatch(/^https:\/\/eventfxr\.com\/api\/maps\/static\?/);
  });
});
