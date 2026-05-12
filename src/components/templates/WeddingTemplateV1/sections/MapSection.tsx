"use client";

import { SectionWrapper, SectionTitle } from "../../shared";
import {
  getDisplayAddress,
  getOsmEmbedPreviewUrl,
  getGoogleDirectionsUrl,
  MAP_IFRAME_REFERRER_POLICY,
} from "@/lib/maps/map-utils";
import type { MapSection } from "@/schemas/event-page";

type MapSectionProps = {
  data: MapSection["data"];
  primaryColor: string;
};

/**
 * Map Section for Wedding template
 * Elegant styling with venue details and embedded map
 */
export function MapSection({ data, primaryColor }: MapSectionProps) {
  const { heading = "Location", venueName, showDirectionsLink } = data;
  const address = getDisplayAddress(data);

  const mapUrl = getOsmEmbedPreviewUrl(data);
  const directionsUrl = getGoogleDirectionsUrl(data);

  return (
    <SectionWrapper ariaLabel="Event location">
      <div className="mx-auto max-w-2xl text-center">
        <SectionTitle>{heading}</SectionTitle>
      </div>

      <div className="mt-12 mx-auto max-w-4xl">
        <div
          className="overflow-hidden rounded-2xl border bg-card shadow-sm"
          style={{ borderColor: `${primaryColor}20` }}
        >
          {/* Map */}
          {mapUrl && (
            <div className="aspect-[16/9] w-full">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy={MAP_IFRAME_REFERRER_POLICY}
                title="Event location map"
              />
            </div>
          )}

          {/* Venue Info */}
          <div className="p-6 text-center">
            {venueName && (
              <h3 className="text-xl font-semibold">{venueName}</h3>
            )}
            {address && <p className="mt-2 text-muted-foreground">{address}</p>}

            {showDirectionsLink && directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <svg
                  className="h-4 w-4"
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
                Get Directions
              </a>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
