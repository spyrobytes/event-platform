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
};

export function EventJsonLd({ event }: EventJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";

  const location = event.venueName || event.city
    ? {
        "@type": "Place",
        name: event.venueName || event.city,
        address: {
          "@type": "PostalAddress",
          streetAddress: event.address || undefined,
          addressLocality: event.city || undefined,
          addressCountry: event.country || undefined,
        },
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
    url: `${baseUrl}/events/${event.slug}`,
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
