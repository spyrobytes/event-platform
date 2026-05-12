import { describe, it, expect } from "vitest";
import {
  hasValidCoordinates,
  getDisplayAddress,
  getEnabledMapSection,
  getOsmEmbedPreviewUrl,
  getGoogleDirectionsUrl,
  getAppleMapsUrl,
  parseOptionalCoordinate,
  validateMapSectionForPublish,
  validateMapSectionsInConfig,
  MAP_IFRAME_REFERRER_POLICY,
} from "@/lib/maps/map-utils";

describe("hasValidCoordinates", () => {
  it("accepts (0, 0) — the bug that started Phase 1", () => {
    expect(hasValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
  });

  it("accepts boundary values", () => {
    expect(hasValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    expect(hasValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
  });

  it("accepts realistic coordinates", () => {
    expect(hasValidCoordinates({ latitude: 43.6532, longitude: -79.3832 })).toBe(true);
  });

  it("rejects NaN", () => {
    expect(hasValidCoordinates({ latitude: NaN, longitude: 0 })).toBe(false);
    expect(hasValidCoordinates({ latitude: 0, longitude: NaN })).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(hasValidCoordinates({ latitude: Infinity, longitude: 0 })).toBe(false);
    expect(hasValidCoordinates({ latitude: 0, longitude: -Infinity })).toBe(false);
  });

  it("rejects out-of-range latitude", () => {
    expect(hasValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(hasValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(hasValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    expect(hasValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
  });

  it("rejects missing coordinates", () => {
    expect(hasValidCoordinates({})).toBe(false);
    expect(hasValidCoordinates({ latitude: 0 })).toBe(false);
    expect(hasValidCoordinates({ longitude: 0 })).toBe(false);
  });

  it("rejects non-number coordinates", () => {
    // Cast through unknown to test runtime robustness against bad data.
    expect(
      hasValidCoordinates({
        latitude: "0" as unknown as number,
        longitude: 0,
      })
    ).toBe(false);
  });
});

describe("getDisplayAddress", () => {
  it("prefers formattedAddress when both are present", () => {
    expect(
      getDisplayAddress({
        formattedAddress: "100 King St W, Toronto",
        address: "100 King St",
      })
    ).toBe("100 King St W, Toronto");
  });

  it("falls back to address when formattedAddress is absent", () => {
    expect(getDisplayAddress({ address: "100 King St" })).toBe("100 King St");
  });

  it("returns undefined when both are empty/whitespace", () => {
    expect(getDisplayAddress({})).toBeUndefined();
    expect(getDisplayAddress({ address: "   " })).toBeUndefined();
    expect(getDisplayAddress({ formattedAddress: "" })).toBeUndefined();
  });

  it("falls through from empty formattedAddress to populated address", () => {
    expect(
      getDisplayAddress({ formattedAddress: "", address: "100 King St" })
    ).toBe("100 King St");
    expect(
      getDisplayAddress({ formattedAddress: "   ", address: "100 King St" })
    ).toBe("100 King St");
  });
});

describe("getOsmEmbedPreviewUrl", () => {
  it("returns null when coords are missing", () => {
    expect(getOsmEmbedPreviewUrl({})).toBeNull();
    expect(getOsmEmbedPreviewUrl({ latitude: 0 })).toBeNull();
  });

  it("returns null when coords are out of range", () => {
    expect(getOsmEmbedPreviewUrl({ latitude: 91, longitude: 0 })).toBeNull();
  });

  it("returns a URL for valid (0, 0) coords", () => {
    const url = getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0 });
    expect(url).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
    expect(url).toContain("marker=0%2C0");
  });

  it("encodes bbox with the configured zoom", () => {
    const tight = getOsmEmbedPreviewUrl({ latitude: 43.65, longitude: -79.38, zoom: 18 });
    const wide = getOsmEmbedPreviewUrl({ latitude: 43.65, longitude: -79.38, zoom: 10 });
    expect(tight).not.toBe(wide);
    // Higher zoom → tighter bbox → smaller numeric range in the bbox param.
    const tightPad = tight!.match(/bbox=([^&]+)/)![1].split("%2C").map(Number);
    const widePad = wide!.match(/bbox=([^&]+)/)![1].split("%2C").map(Number);
    const tightRange = tightPad[2] - tightPad[0];
    const wideRange = widePad[2] - widePad[0];
    expect(tightRange).toBeLessThan(wideRange);
  });

  it("defaults to zoom 15 when zoom is missing", () => {
    const url = getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0 });
    const explicit = getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0, zoom: 15 });
    expect(url).toBe(explicit);
  });

  it("defaults to zoom 15 when zoom is NaN or Infinity", () => {
    const explicit = getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0, zoom: 15 });
    expect(getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0, zoom: NaN })).toBe(explicit);
    expect(getOsmEmbedPreviewUrl({ latitude: 0, longitude: 0, zoom: Infinity })).toBe(explicit);
  });
});

describe("getGoogleDirectionsUrl", () => {
  it("uses coordinates when available", () => {
    expect(
      getGoogleDirectionsUrl({ latitude: 43.65, longitude: -79.38 })
    ).toBe("https://www.google.com/maps/dir/?api=1&destination=43.65,-79.38");
  });

  it("uses coordinates for (0, 0)", () => {
    expect(getGoogleDirectionsUrl({ latitude: 0, longitude: 0 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=0,0"
    );
  });

  it("falls back to formattedAddress when coords are absent", () => {
    expect(
      getGoogleDirectionsUrl({ formattedAddress: "100 King St W, Toronto" })
    ).toBe("https://www.google.com/maps/search/?api=1&query=100%20King%20St%20W%2C%20Toronto");
  });

  it("falls back to address (legacy field) when formattedAddress is absent", () => {
    expect(getGoogleDirectionsUrl({ address: "100 King St" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=100%20King%20St"
    );
  });

  it("falls back to venueName as a last resort", () => {
    expect(getGoogleDirectionsUrl({ venueName: "The Grand Ballroom" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=The%20Grand%20Ballroom"
    );
  });

  it("returns null when there is no location data at all", () => {
    expect(getGoogleDirectionsUrl({})).toBeNull();
  });

  it("ignores out-of-range coords and falls through to address", () => {
    expect(
      getGoogleDirectionsUrl({ latitude: 999, longitude: 0, address: "100 King St" })
    ).toBe("https://www.google.com/maps/search/?api=1&query=100%20King%20St");
  });
});

describe("getAppleMapsUrl", () => {
  it("uses coordinates with venue name as label", () => {
    expect(
      getAppleMapsUrl({ latitude: 43.65, longitude: -79.38, venueName: "City Hall" })
    ).toBe("https://maps.apple.com/?ll=43.65,-79.38&q=City%20Hall");
  });

  it("uses a default label when venue name is absent", () => {
    expect(getAppleMapsUrl({ latitude: 43.65, longitude: -79.38 })).toBe(
      "https://maps.apple.com/?ll=43.65,-79.38&q=Event%20location"
    );
  });

  it("falls back to address query when coords are absent", () => {
    expect(getAppleMapsUrl({ formattedAddress: "100 King St W" })).toBe(
      "https://maps.apple.com/?q=100%20King%20St%20W"
    );
  });

  it("returns null when there is no location data at all", () => {
    expect(getAppleMapsUrl({})).toBeNull();
  });

  it("ignores out-of-range coords and falls through to address", () => {
    expect(
      getAppleMapsUrl({ latitude: 999, longitude: 0, address: "100 King St" })
    ).toBe("https://maps.apple.com/?q=100%20King%20St");
  });
});

describe("parseOptionalCoordinate", () => {
  it("returns undefined for empty input", () => {
    expect(parseOptionalCoordinate("", -90, 90)).toBeUndefined();
    expect(parseOptionalCoordinate("   ", -90, 90)).toBeUndefined();
  });

  it("returns valid numbers", () => {
    expect(parseOptionalCoordinate("0", -90, 90)).toBe(0);
    expect(parseOptionalCoordinate("43.6532", -90, 90)).toBe(43.6532);
    expect(parseOptionalCoordinate("-79.3832", -180, 180)).toBe(-79.3832);
  });

  it("trims whitespace-padded numeric input", () => {
    expect(parseOptionalCoordinate("  43.65  ", -90, 90)).toBe(43.65);
    expect(parseOptionalCoordinate("\t-79.38\n", -180, 180)).toBe(-79.38);
  });

  it("returns null for partial keystrokes that don't parse as numbers", () => {
    expect(parseOptionalCoordinate("-", -90, 90)).toBeNull();
    expect(parseOptionalCoordinate(".", -90, 90)).toBeNull();
    expect(parseOptionalCoordinate("abc", -90, 90)).toBeNull();
  });

  it("returns null for out-of-range numbers", () => {
    expect(parseOptionalCoordinate("91", -90, 90)).toBeNull();
    expect(parseOptionalCoordinate("-91", -90, 90)).toBeNull();
    expect(parseOptionalCoordinate("181", -180, 180)).toBeNull();
  });

  it("accepts boundary values", () => {
    expect(parseOptionalCoordinate("90", -90, 90)).toBe(90);
    expect(parseOptionalCoordinate("-90", -90, 90)).toBe(-90);
    expect(parseOptionalCoordinate("180", -180, 180)).toBe(180);
  });

  it("returns null for NaN/Infinity", () => {
    expect(parseOptionalCoordinate("NaN", -90, 90)).toBeNull();
    expect(parseOptionalCoordinate("Infinity", -90, 90)).toBeNull();
  });
});

describe("MAP_IFRAME_REFERRER_POLICY", () => {
  it("is the documented default", () => {
    expect(MAP_IFRAME_REFERRER_POLICY).toBe("no-referrer-when-downgrade");
  });
});

describe("validateMapSectionForPublish", () => {
  it("passes disabled sections regardless of data completeness", () => {
    expect(
      validateMapSectionForPublish({ enabled: false, data: {} })
    ).toEqual({ ok: true });
  });

  it("passes an enabled section with formattedAddress + valid coords", () => {
    expect(
      validateMapSectionForPublish({
        enabled: true,
        data: {
          formattedAddress: "100 King St W, Toronto",
          latitude: 43.6481,
          longitude: -79.3829,
        },
      })
    ).toEqual({ ok: true });
  });

  it("passes an enabled section using legacy address field", () => {
    expect(
      validateMapSectionForPublish({
        enabled: true,
        data: {
          address: "100 King St W",
          latitude: 43.6481,
          longitude: -79.3829,
        },
      })
    ).toEqual({ ok: true });
  });

  it("passes an enabled section with only structured parts (no formattedAddress)", () => {
    expect(
      validateMapSectionForPublish({
        enabled: true,
        data: {
          city: "Toronto",
          country: "Canada",
          latitude: 43.6481,
          longitude: -79.3829,
        },
      })
    ).toEqual({ ok: true });
  });

  it("rejects enabled section missing any address", () => {
    const result = validateMapSectionForPublish({
      enabled: true,
      data: { latitude: 43.6481, longitude: -79.3829 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/address/i);
  });

  it("rejects enabled section missing coords", () => {
    const result = validateMapSectionForPublish({
      enabled: true,
      data: { formattedAddress: "100 King St W, Toronto" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/coordinates/i);
  });

  it("accepts enabled section at (0, 0) with address", () => {
    expect(
      validateMapSectionForPublish({
        enabled: true,
        data: { formattedAddress: "Null Island", latitude: 0, longitude: 0 },
      })
    ).toEqual({ ok: true });
  });
});

describe("getEnabledMapSection", () => {
  it("returns undefined when no map section exists", () => {
    expect(
      getEnabledMapSection({ sections: [{ type: "rsvp" }, { type: "schedule" }] })
    ).toBeUndefined();
  });

  it("returns the first enabled map section's data", () => {
    const data = { formattedAddress: "X", latitude: 1, longitude: 2 };
    expect(
      getEnabledMapSection({
        sections: [
          { type: "schedule" },
          { type: "map", enabled: true, data },
        ],
      })
    ).toEqual(data);
  });

  it("skips disabled map sections", () => {
    expect(
      getEnabledMapSection({
        sections: [{ type: "map", enabled: false, data: { formattedAddress: "X" } }],
      })
    ).toBeUndefined();
  });

  it("treats omitted enabled as enabled (true by default)", () => {
    const data = { formattedAddress: "X" };
    expect(
      getEnabledMapSection({ sections: [{ type: "map", data }] })
    ).toEqual(data);
  });
});

describe("validateMapSectionsInConfig", () => {
  it("passes a config with no map sections", () => {
    expect(
      validateMapSectionsInConfig({ sections: [{ type: "rsvp" }, { type: "schedule" }] })
    ).toEqual({ ok: true });
  });

  it("passes when every map section is publish-ready", () => {
    expect(
      validateMapSectionsInConfig({
        sections: [
          { type: "schedule" },
          {
            type: "map",
            enabled: true,
            data: {
              formattedAddress: "100 King St W, Toronto",
              latitude: 43.6481,
              longitude: -79.3829,
            },
          },
        ],
      })
    ).toEqual({ ok: true });
  });

  it("reports the first failing map section's index", () => {
    const result = validateMapSectionsInConfig({
      sections: [
        { type: "schedule" },
        { type: "map", enabled: true, data: {} },
        {
          type: "map",
          enabled: true,
          data: {
            formattedAddress: "Valid",
            latitude: 43.6481,
            longitude: -79.3829,
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.sectionIndex).toBe(1);
  });

  it("skips disabled map sections", () => {
    expect(
      validateMapSectionsInConfig({
        sections: [
          { type: "map", enabled: false, data: {} },
        ],
      })
    ).toEqual({ ok: true });
  });
});
