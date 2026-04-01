"use client";

/**
 * Stepper RSVP — The Celebration House
 *
 * RSVP form with a step indicator header and prominent
 * event badge. More structured feel for larger, multi-event
 * weddings where RSVP is a bigger commitment.
 */

import type { RSVPRendererProps } from "../../types";
import { RSVPForm } from "@/components/features/RSVPForm";

export function StepperRSVP({ data, eventId }: RSVPRendererProps) {
  const heading = data.heading || "RSVP";

  return (
    <section
      style={{
        padding: "var(--section-y, 96px) 0",
        background: "var(--cream, #f0ebe3)",
        textAlign: "center",
      }}
      aria-label="RSVP"
      id="rsvp"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Step indicator */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "clamp(16px, 2vw, 24px)",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accent, #7a8c72)",
              color: "var(--surface, #ffffff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--sans)",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            1
          </span>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--text-2, #786f65)",
            }}
          >
            Let us know
          </span>
        </div>

        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2)",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(8px, 1vw, 12px)",
          }}
        >
          {heading}
        </h2>
        {data.description && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "var(--text-2)", lineHeight: 1.75, maxWidth: "48ch", margin: "0 auto clamp(32px, 4vw, 48px)" }}>
            {data.description}
          </p>
        )}

        {/* Form card */}
        <div
          style={{
            maxWidth: 540,
            margin: "0 auto",
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r, 16px)",
            padding: "clamp(28px, 4vw, 44px)",
            textAlign: "left",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
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
