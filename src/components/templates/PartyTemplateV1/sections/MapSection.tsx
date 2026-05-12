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
 * Map Section for Party template
 * Fun, vibrant styling with playful elements
 */
export function MapSection({ data, primaryColor }: MapSectionProps) {
  const { heading = "Find the Party!", venueName, showDirectionsLink } = data;
  const address = getDisplayAddress(data);
  const directionsUrl = getGoogleDirectionsUrl(data);
  const appleUrl = getAppleMapsUrl(data);

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
          <LazyMap data={data} className="aspect-[16/9] w-full" />

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
              {address && <p className="mt-2 text-lg text-muted-foreground">{address}</p>}

              <LocationNotes data={data} className="mt-6 text-left max-w-md mx-auto" />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {showDirectionsLink && directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Take Me There!
                  </a>
                )}
                {appleUrl && (
                  <a
                    href={appleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-2 text-sm font-bold transition-colors hover:bg-muted/30"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    Apple Maps
                  </a>
                )}
                {address && (
                  <CopyAddressButton
                    address={address}
                    className="rounded-full border-2 border-muted px-6 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted/30"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
