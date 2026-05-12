/**
 * Geocoding service — server-side only.
 *
 * The `Geocoder` interface is provider-agnostic so a future swap (e.g. to
 * Mapbox for branded autocomplete in Phase 6) is contained to one new
 * adapter file. The env-driven factory is the only thing that knows which
 * implementation is live.
 */

import { env } from "@/env";

export type GeocodeResult = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  provider: "locationiq" | "none";
  timezone?: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

export type GeocodeOptions = {
  /** ISO 3166-1 alpha-2 country code to bias results. */
  biasCountry?: string;
  /** Cap the number of candidates returned. Defaults to 5. */
  limit?: number;
};

export interface Geocoder {
  readonly provider: GeocodeResult["provider"];
  geocode(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]>;
}

// Returns an empty candidate list so dev / CI / preview deploys can exercise
// the editor flow without provisioning a LocationIQ key. The UI surfaces a
// "no candidates" empty state, which mirrors the genuine no-match path.
class NoopGeocoder implements Geocoder {
  readonly provider = "none" as const;
  async geocode(): Promise<GeocodeResult[]> {
    return [];
  }
}

// LocationIQ forward geocoding via the v1 search endpoint.
// Docs: https://locationiq.com/docs#forward-geocoding
//
// We request `addressdetails=1` for the structured parts and `normalizecity=1`
// to fold variants (e.g. "NYC" → "New York"). `format=json` returns a typed
// JSON array we can map directly. Timezone is not in the default response —
// callers that want timezone propagation should layer it on (Phase 5 polish).
type LocationIQResponse = Array<{
  place_id?: string;
  lat: string;
  lon: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}>;

class LocationIQGeocoder implements Geocoder {
  readonly provider = "locationiq" as const;

  constructor(private readonly apiKey: string) {}

  async geocode(query: string, options: GeocodeOptions = {}): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: query,
      format: "json",
      addressdetails: "1",
      normalizecity: "1",
      limit: String(options.limit ?? 5),
    });
    if (options.biasCountry) {
      params.set("countrycodes", options.biasCountry.toLowerCase());
    }

    const response = await fetch(`https://us1.locationiq.com/v1/search.php?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      // 404 from LocationIQ means "no results for this query" — treat as []
      // rather than an error so callers can show the empty-candidates state.
      if (response.status === 404) return [];
      throw new Error(`LocationIQ responded ${response.status}`);
    }

    const data = (await response.json()) as LocationIQResponse;
    return data.map((item) => normalizeLocationIQResult(item));
  }
}

function normalizeLocationIQResult(item: LocationIQResponse[number]): GeocodeResult {
  const addr = item.address ?? {};
  const addressLine1 = [addr.house_number, addr.road].filter(Boolean).join(" ") || undefined;
  const city = addr.city ?? addr.town ?? addr.village;
  return {
    formattedAddress: item.display_name ?? "",
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    placeId: item.place_id,
    provider: "locationiq",
    addressLine1,
    city,
    region: addr.state,
    postalCode: addr.postcode,
    country: addr.country,
  };
}

/**
 * Env-driven factory. Returns a Noop geocoder when the provider is not
 * configured or the required key is missing — callers don't need to
 * special-case "no provider".
 */
export function getGeocoder(): Geocoder {
  if (env.GEOCODER_PROVIDER === "locationiq" && env.LOCATIONIQ_API_KEY) {
    return new LocationIQGeocoder(env.LOCATIONIQ_API_KEY);
  }
  return new NoopGeocoder();
}

// Exposed for unit tests that need to construct adapters directly.
export const __testing = { LocationIQGeocoder, NoopGeocoder };
