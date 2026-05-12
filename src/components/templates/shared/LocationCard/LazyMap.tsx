"use client";

import { useIntersectionObserver } from "@/hooks/use-section-visibility";
import { cn } from "@/lib/utils";
import {
  getDisplayAddress,
  getOsmEmbedPreviewUrl,
  MAP_IFRAME_REFERRER_POLICY,
  type LocationForMap,
} from "@/lib/maps/map-utils";
import { getStaticMapImageUrl } from "@/lib/maps/static-map";

type LazyMapProps = {
  data: LocationForMap;
  /** Outer wrapper className — supplies the aspect ratio or fixed height. */
  className?: string;
};

/**
 * Map embed with a static-image fallback.
 *
 *   - Static PNG (LocationIQ Static Maps via our proxy) renders immediately
 *     and stays visible until the interactive iframe takes over.
 *   - The OSM iframe lazy-mounts once the wrapper scrolls within 200px of
 *     the viewport — saves the tile fetch on LCP and for visitors who never
 *     scroll to the map.
 *   - Print stylesheet hides the iframe and falls back to the static PNG —
 *     iframes don't render in print.
 *   - No-JS users see the static PNG and never the iframe (graceful
 *     degradation).
 *
 * Returns null when the location lacks valid coords — the address +
 * directions buttons in the surrounding card stay useful on their own.
 */
export function LazyMap({ data, className }: LazyMapProps) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: "200px",
    triggerOnce: true,
  });
  const mapUrl = getOsmEmbedPreviewUrl(data);
  const staticUrl = getStaticMapImageUrl(data, { width: 1200, height: 800 });
  if (!mapUrl) return null;

  const altText = `Map of ${getDisplayAddress(data) ?? "the event venue"}`;

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      role="presentation"
    >
      {staticUrl ? (
        <img
          src={staticUrl}
          alt={altText}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 bg-muted/30"
          aria-hidden="true"
        />
      )}
      {hasBeenVisible && (
        <iframe
          src={mapUrl}
          className="absolute inset-0 h-full w-full print:hidden"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy={MAP_IFRAME_REFERRER_POLICY}
          allowFullScreen
          title="Event location map"
        />
      )}
    </div>
  );
}
