import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EventJsonLd } from "@/components/seo/EventJsonLd";
import type { MapSection } from "@/schemas/event-page";

function extractJsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector("script[type='application/ld+json']");
  if (!script) throw new Error("EventJsonLd did not render a script tag");
  return JSON.parse(script.textContent ?? script.innerHTML) as Record<string, unknown>;
}

const baseEvent = {
  title: "Sample Event",
  slug: "sample-event",
  description: "An event",
  startAt: new Date("2026-06-01T18:00:00Z"),
  endAt: null,
  venueName: "Grand Ballroom",
  address: "100 King St W, Toronto, ON",
  city: "Toronto",
  country: "Canada",
  coverImageUrl: null,
  organization: null,
  creator: { name: "Organizer Name" },
};

describe("EventJsonLd — base behavior (no mapSection)", () => {
  it("emits Event structured data with the Event-row location fallback", () => {
    const { container } = render(<EventJsonLd event={baseEvent} />);
    const ld = extractJsonLd(container);

    expect(ld["@type"]).toBe("Event");
    expect(ld.name).toBe("Sample Event");

    const location = ld.location as Record<string, unknown> | undefined;
    expect(location?.["@type"]).toBe("Place");
    expect(location?.name).toBe("Grand Ballroom");

    const addr = location?.address as Record<string, unknown> | undefined;
    expect(addr?.streetAddress).toBe("100 King St W, Toronto, ON");
    expect(addr?.addressLocality).toBe("Toronto");
    expect(addr?.addressCountry).toBe("Canada");

    // No geo without a map section's coords.
    expect(location?.geo).toBeUndefined();
  });

  it("omits location entirely when neither venue nor city is set", () => {
    const sparseEvent = { ...baseEvent, venueName: null, city: null };
    const { container } = render(<EventJsonLd event={sparseEvent} />);
    const ld = extractJsonLd(container);
    expect(ld.location).toBeUndefined();
  });
});

describe("EventJsonLd — with mapSection", () => {
  const mapSection: MapSection["data"] = {
    heading: "Location",
    formattedAddress: "100 King St W, Toronto, ON M5X 1A9",
    addressLine1: "100 King St W",
    city: "Toronto",
    region: "ON",
    postalCode: "M5X 1A9",
    country: "Canada",
    latitude: 43.6481,
    longitude: -79.3829,
    zoom: 15,
    showDirectionsLink: true,
  };

  it("emits structured PostalAddress with mapSection precedence", () => {
    const { container } = render(<EventJsonLd event={baseEvent} mapSection={mapSection} />);
    const ld = extractJsonLd(container);
    const addr = (ld.location as Record<string, unknown>).address as Record<string, unknown>;

    expect(addr.streetAddress).toBe("100 King St W");
    expect(addr.addressLocality).toBe("Toronto");
    expect(addr.addressRegion).toBe("ON");
    expect(addr.postalCode).toBe("M5X 1A9");
    expect(addr.addressCountry).toBe("Canada");
  });

  it("emits GeoCoordinates when coords are valid", () => {
    const { container } = render(<EventJsonLd event={baseEvent} mapSection={mapSection} />);
    const ld = extractJsonLd(container);
    const geo = (ld.location as Record<string, unknown>).geo as Record<string, unknown>;

    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(geo.latitude).toBe(43.6481);
    expect(geo.longitude).toBe(-79.3829);
  });

  it("omits geo when coords are absent", () => {
    const partial: MapSection["data"] = {
      ...mapSection,
      latitude: undefined,
      longitude: undefined,
    };
    const { container } = render(<EventJsonLd event={baseEvent} mapSection={partial} />);
    const ld = extractJsonLd(container);
    expect((ld.location as Record<string, unknown>).geo).toBeUndefined();
  });

  it("renders Place even when the Event row has no venue (mapSection drives location)", () => {
    const sparseEvent = { ...baseEvent, venueName: null, city: null };
    const { container } = render(<EventJsonLd event={sparseEvent} mapSection={mapSection} />);
    const ld = extractJsonLd(container);
    const location = ld.location as Record<string, unknown>;
    expect(location["@type"]).toBe("Place");
    // No venue name available — the Place renders without a `name` field.
    expect(location.name).toBeUndefined();
    expect((location.address as Record<string, unknown>).postalCode).toBe("M5X 1A9");
  });
});
