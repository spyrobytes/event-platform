import type { MapSection } from "@/schemas/event-page";
import { hasValidCoordinates } from "@/lib/maps/map-utils";

type EventData = {
  title: string;
  slug: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  coverImageUrl?: string | null;
  organization?: {
    name: string;
  } | null;
  creator: {
    name?: string | null;
  };
};

type EventJsonLdProps = {
  event: EventData;
  /**
   * Optional map section data. When present, its structured address fields
   * + coordinates take precedence over the Event row's plain `address` —
   * giving search crawlers a richer PostalAddress + GeoCoordinates payload.
   * Pass `undefined` when the section is absent or disabled.
   */
  mapSection?: MapSection["data"];
};

export function EventJsonLd({ event, mapSection }: EventJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

  const placeName = event.venueName || event.city;
  const hasAnyLocation = Boolean(placeName) || Boolean(mapSection);

  const location = hasAnyLocation
    ? {
        "@type": "Place",
        name: placeName || undefined,
        address: {
          "@type": "PostalAddress",
          // `event.address` is a legacy plain-string fallback for pre-Phase-2
          // events where the Event row was the only location source. It often
          // contains the full line (street + city + postal code) — technically
          // not what schema.org/PostalAddress.streetAddress wants. The
          // preferred path is `mapSection.addressLine1`, which the Phase 3
          // LocationPicker populates with the street portion only.
          streetAddress: mapSection?.addressLine1 || event.address || undefined,
          addressLocality: mapSection?.city || event.city || undefined,
          addressRegion: mapSection?.region || undefined,
          postalCode: mapSection?.postalCode || undefined,
          addressCountry: mapSection?.country || event.country || undefined,
        },
        geo:
          mapSection && hasValidCoordinates(mapSection)
            ? {
                "@type": "GeoCoordinates",
                latitude: mapSection.latitude,
                longitude: mapSection.longitude,
              }
            : undefined,
      }
    : undefined;

  const organizer = event.organization
    ? {
        "@type": "Organization",
        name: event.organization.name,
      }
    : event.creator.name
      ? {
          "@type": "Person",
          name: event.creator.name,
        }
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    startDate: event.startAt.toISOString(),
    endDate: event.endAt?.toISOString() || undefined,
    url: `${baseUrl}/e/${event.slug}`,
    image: event.coverImageUrl || undefined,
    location,
    organizer,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(
    JSON.stringify(jsonLd, (_, value) => (value === undefined ? undefined : value))
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}
