"use client";

import type { MapSection } from "@/schemas/event-page";

type MapV2Props = {
  data: MapSection["data"];
};

/**
 * Map V2 — Location section for the cinematic wedding template.
 *
 * Embeds an OpenStreetMap iframe inside a V2 card with venue info and directions link.
 */
export function MapV2({ data }: MapV2Props) {
  const {
    heading = "Location",
    venueName,
    address,
    latitude,
    longitude,
    showDirectionsLink = true,
  } = data;
  const kickerText = "Location";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  const hasLocation = address && latitude != null && longitude != null;

  const bboxPad = 0.01;
  const mapSrc = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - bboxPad},${latitude - bboxPad},${longitude + bboxPad},${latitude + bboxPad}&layer=mapnik&marker=${latitude},${longitude}`
    : "";

  const directionsUrl = hasLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : "";

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Location"
      id="map"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          {showKicker && (
            <p className="v2-kicker" style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}>
              {kickerText}
            </p>
          )}
          <h2 style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--night, #1e1b17)",
          }}>
            {heading}
          </h2>
        </div>

        {hasLocation ? (
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
          }}>
            {/* Map iframe */}
            <div style={{
              width: "100%",
              height: 400,
              overflow: "hidden",
            }}>
              <iframe
                title="Event location map"
                src={mapSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  display: "block",
                }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Venue info */}
            <div style={{
              padding: "clamp(24px, 3vw, 32px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}>
              <div style={{ flex: "1 1 auto", minWidth: 200 }}>
                {venueName && (
                  <h3 style={{
                    fontFamily: "var(--serif)",
                    fontSize: "var(--h3, clamp(1.1rem, 1.8vw, 1.35rem))",
                    fontWeight: 400,
                    lineHeight: 1.25,
                    color: "var(--night, #1e1b17)",
                    marginBottom: 6,
                  }}>
                    {venueName}
                  </h3>
                )}
                <p style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  fontSize: "var(--body, 1rem)",
                  color: "var(--text-2, #786f65)",
                  lineHeight: 1.6,
                }}>
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 4 }}
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {address}
                </p>
              </div>

              {showDirectionsLink && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--sans)",
                    fontSize: "var(--sm, 0.85rem)",
                    fontWeight: 600,
                    padding: "12px 26px",
                    borderRadius: 999,
                    background: "transparent",
                    color: "var(--accent, #7a8c72)",
                    border: "1px solid var(--accent, #7a8c72)",
                    textDecoration: "none",
                    transition: "all var(--transition, 0.3s ease)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent, #7a8c72)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--accent, #7a8c72)";
                  }}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  Get Directions
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div style={{
            border: "2px dashed var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: 48,
            textAlign: "center",
            color: "var(--text-3, #a69e93)",
          }}>
            Location details coming soon
          </div>
        )}
      </div>
    </section>
  );
}
