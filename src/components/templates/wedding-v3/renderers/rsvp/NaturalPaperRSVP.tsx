"use client";

/**
 * Natural Paper RSVP — The Garden House
 *
 * Form on a warm paper-textured card with organic rounded shape.
 * Generous border-radius matches the template's curved aesthetic.
 */

import type { RSVPRendererProps } from "../../types";
import { RSVPForm } from "@/components/features/RSVPForm";

export function NaturalPaperRSVP({ data, eventId }: RSVPRendererProps) {
  const heading = data.heading || "RSVP";

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", textAlign: "center" }}
      aria-label="RSVP"
      id="rsvp"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
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
              maxWidth: "48ch",
              margin: "0 auto clamp(32px, 4vw, 48px)",
            }}
          >
            {data.description}
          </p>
        )}

        {/* Organic card */}
        <div
          style={{
            maxWidth: 540,
            margin: "0 auto",
            background: "var(--cream, #f0ebe3)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            padding: "clamp(28px, 4vw, 44px)",
            textAlign: "left",
          }}
        >
          <RSVPForm
            eventId={eventId}
            showMaybeOption={data.showMaybeOption}
            plusOnesAllowed={data.allowPlusOnes ? data.maxPlusOnes : 0}
            successMessage={data.successMessage}
            hideCard
          />
        </div>
      </div>
    </section>
  );
}
