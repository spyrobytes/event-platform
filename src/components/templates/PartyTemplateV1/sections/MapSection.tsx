"use client";

import { SectionWrapper, SectionTitle } from "../../shared";

type MapSectionProps = {
  data: {
    heading: string;
    venueName?: string;
    address: string;
    latitude: number;
    longitude: number;
    zoom: number;
    showDirectionsLink: boolean;
  };
  primaryColor: string;
};

/**
 * Map Section for Party template
 * Fun, vibrant styling with playful elements
 */
export function MapSection({ data, primaryColor }: MapSectionProps) {
  const {
    heading = "Find the Party!",
    venueName,
    address,
    latitude,
    longitude,
    zoom,
    showDirectionsLink,
  } = data;

  // OpenStreetMap embed URL
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;

  // Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <SectionWrapper ariaLabel="Event location" className="bg-muted/20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 text-4xl">📍</div>
        <SectionTitle>{heading}</SectionTitle>
      </div>

      <div className="mt-12 mx-auto max-w-4xl">
        <div
          className="overflow-hidden rounded-3xl border-4 bg-card shadow-xl"
          style={{ borderColor: primaryColor }}
        >
          {/* Map */}
          <div className="aspect-[16/9] w-full">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Event location map"
            />
          </div>

          {/* Venue Info */}
          <div className="relative p-6 text-center">
            {/* Decorative elements */}
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="absolute -bottom-4 -left-4 h-12 w-12 rounded-full opacity-20"
              style={{ backgroundColor: primaryColor }}
            />

            <div className="relative">
              {venueName && (
                <h3 className="text-2xl font-bold">{venueName}</h3>
              )}
              <p className="mt-2 text-lg text-muted-foreground">{address}</p>

              {showDirectionsLink && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Take Me There!
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
