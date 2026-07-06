/**
 * Streamlined RSVP — The Intimate Note
 *
 * Single centered card with minimal chrome. No info panel,
 * no side-by-side layout — just the form, centered and clean.
 * Narrower than other templates to match the intimate width.
 */

import type { RSVPRendererProps } from "../../types";
import { RsvpCta } from "@/components/features/RSVPForm";

export function StreamlinedRSVP({ data, eventSlug }: RSVPRendererProps) {
  const heading = data.heading || "RSVP";

  return (
    <section
      style={{
        padding: "var(--section-y, 96px) 0",
        textAlign: "center",
      }}
      aria-label="RSVP"
      id="rsvp"
    >
      <div
        style={{
          width: "min(var(--max, 800px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          maxWidth: 480,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--cursive, var(--serif))",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(8px, 1vw, 12px)",
          }}
        >
          {heading}
        </h2>

        {data.description && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--body, 1rem)",
              color: "var(--text-2, #786f65)",
              lineHeight: 1.75,
              marginBottom: "clamp(24px, 3vw, 40px)",
            }}
          >
            {data.description}
          </p>
        )}

        {/* Form — no card wrapper, just a top rule */}
        <div
          style={{
            borderTop: "1px solid var(--border, #e8e1d6)",
            paddingTop: "clamp(24px, 3vw, 32px)",
            textAlign: "left",
          }}
        >
          <RsvpCta eventSlug={eventSlug} />
        </div>
      </div>
    </section>
  );
}
