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
 * Map Section for Conference template
 * Professional layout with venue details sidebar
 */
export function MapSection({ data, primaryColor }: MapSectionProps) {
  const { heading = "Venue", venueName, showDirectionsLink } = data;
  const address = getDisplayAddress(data);

  const mapUrl = getOsmEmbedPreviewUrl(data);
  const directionsUrl = getGoogleDirectionsUrl(data);

  return (
    <SectionWrapper ariaLabel="Event location" className="bg-muted/30">
      <div className="mx-auto max-w-2xl text-center">
        <div
          className="mb-4 inline-block rounded-full px-4 py-1 text-sm font-medium"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          Venue Information
        </div>
        <SectionTitle>{heading}</SectionTitle>
      </div>

      <div className="mt-12 mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Venue Details Card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-1">
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: primaryColor }}
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
              </div>
              <div className="flex-1">
                {venueName && (
                  <h3 className="font-semibold">{venueName}</h3>
                )}
                {address && <p className="mt-1 text-sm text-muted-foreground">{address}</p>}
              </div>
            </div>

            {showDirectionsLink && directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors hover:bg-muted"
                style={{ borderColor: primaryColor, color: primaryColor }}
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Get Directions
              </a>
            )}
          </div>

          {/* Map */}
          {mapUrl && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm lg:col-span-2">
              <div className="aspect-[4/3] w-full lg:aspect-[16/9]">
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
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
