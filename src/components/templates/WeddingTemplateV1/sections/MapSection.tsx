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
  const directionsUrl = getGoogleDirectionsUrl(data);
  const appleUrl = getAppleMapsUrl(data);

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
          <LazyMap data={data} className="aspect-[16/9] w-full" />

          <div className="p-6 text-center">
            {venueName && (
              <h3 className="text-xl font-semibold">{venueName}</h3>
            )}
            {address && <p className="mt-2 text-muted-foreground">{address}</p>}

            <LocationNotes data={data} className="mt-6 text-left" />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {showDirectionsLink && directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Get Directions
                </a>
              )}
              {appleUrl && (
                <a
                  href={appleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-6 py-2 text-sm font-medium transition-colors hover:bg-muted/40"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Apple Maps
                </a>
              )}
              {address && (
                <CopyAddressButton
                  address={address}
                  className="rounded-full border px-6 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
