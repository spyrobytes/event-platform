/**
 * Side-by-Side RSVP — The Editorial
 *
 * Two-column layout: left column has the CTA,
 * right column has event summary/info panel.
 * Clean, editorial presentation with thin rules and no shadows.
 */

import type { RSVPRendererProps } from "../../types";
import { RsvpCta } from "@/components/features/RSVPForm";

export function SideBySideRSVP({ data, eventSlug }: RSVPRendererProps) {
  const heading = data.heading || "RSVP";

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="RSVP"
      id="rsvp"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "clamp(40px, 5vw, 64px)" }}>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              marginBottom: 12,
            }}
          >
            RSVP
          </p>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 300,
              lineHeight: 1.15,
              color: "var(--text, #3d3830)",
              maxWidth: "24ch",
            }}
          >
            {heading}
          </h2>
          {data.description && (
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
                lineHeight: 1.75,
                color: "var(--text-2, #786f65)",
                marginTop: 12,
                maxWidth: "56ch",
              }}
            >
              {data.description}
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(32px, 5vw, 64px)",
            alignItems: "start",
          }}
        >
          {/* Left: RSVP CTA */}
          <div
            style={{
              borderTop: "1px solid var(--border, #e8e1d6)",
              paddingTop: "clamp(24px, 3vw, 40px)",
            }}
          >
            <RsvpCta eventSlug={eventSlug} />
          </div>

          {/* Right: Info panel */}
          <div
            style={{
              borderTop: "1px solid var(--border, #e8e1d6)",
              paddingTop: "clamp(24px, 3vw, 40px)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--sm, 0.85rem)",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                color: "var(--accent, #7a8c72)",
                marginBottom: 16,
              }}
            >
              Quick Info
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
                lineHeight: 1.7,
                color: "var(--text-2, #786f65)",
              }}
            >
              {data.showMaybeOption && (
                <p>Not sure yet? You can RSVP as &quot;Maybe&quot; and update later.</p>
              )}
              {data.allowPlusOnes && data.maxPlusOnes > 0 && (
                <p>You may bring up to {data.maxPlusOnes} additional {data.maxPlusOnes === 1 ? "guest" : "guests"}.</p>
              )}
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--text-3, #a69e93)",
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                We look forward to celebrating with you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stack the columns */}
      <style>{`
        @media (max-width: 768px) {
          #rsvp [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
