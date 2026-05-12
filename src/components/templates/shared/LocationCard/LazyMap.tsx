"use client";

import { useIntersectionObserver } from "@/hooks/use-section-visibility";
import { cn } from "@/lib/utils";
import {
  getOsmEmbedPreviewUrl,
  MAP_IFRAME_REFERRER_POLICY,
  type LocationForMap,
} from "@/lib/maps/map-utils";

type LazyMapProps = {
  data: LocationForMap;
  /** Outer wrapper className — supplies the aspect ratio or fixed height. */
  className?: string;
};

/**
 * Lazy-mounted OpenStreetMap iframe. The iframe doesn't render until the
 * wrapping element scrolls within 200px of the viewport — that keeps the
 * initial public-page HTML clean, avoids the OSM tile fetch on LCP, and
 * trims the third-party bytes that would otherwise hit every visitor.
 *
 * Returns null when the location lacks a valid map URL — keeps the
 * fallback hierarchy honest (address + actions still useful without a
 * map). Each template caller passes its own aspect-ratio className.
 */
export function LazyMap({ data, className }: LazyMapProps) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: "200px",
    triggerOnce: true,
  });
  const mapUrl = getOsmEmbedPreviewUrl(data);
  if (!mapUrl) return null;

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      role="presentation"
    >
      {hasBeenVisible ? (
        <iframe
          src={mapUrl}
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy={MAP_IFRAME_REFERRER_POLICY}
          allowFullScreen
          title="Event location map"
        />
      ) : (
        <div
          className="absolute inset-0 bg-muted/30"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
