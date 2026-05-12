"use client";

import { SectionWrapper, SectionTitle } from "../../shared";
import {
  CopyAddressButton,
  LazyMap,
  LocationNotes,
} from "../../shared/LocationCard";
import {
  getAppleMapsUrl,
  getDisplayAddress,
  getGoogleDirectionsUrl,
  hasValidCoordinates,
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
  const directionsUrl = getGoogleDirectionsUrl(data);
  const appleUrl = getAppleMapsUrl(data);
  const hasCoords = hasValidCoordinates(data);

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

            <LocationNotes data={data} className="mt-6" />

            <div className="mt-6 space-y-2">
              {showDirectionsLink && directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors hover:bg-muted"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Get Directions
                </a>
              )}
              {appleUrl && (
                <a
                  href={appleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors hover:bg-muted text-muted-foreground"
                >
                  Apple Maps
                </a>
              )}
              {address && (
                <CopyAddressButton
                  address={address}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                />
              )}
            </div>
          </div>

          {/* Map */}
          {hasCoords && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm lg:col-span-2">
              <LazyMap data={data} className="aspect-[4/3] w-full lg:aspect-[16/9]" />
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
