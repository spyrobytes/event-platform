"use client";

import type { RSVPSection } from "@/schemas/event-page";
import { RSVPForm } from "@/components/features/RSVPForm";

type RSVPV2Props = {
  data: RSVPSection["data"];
  eventId: string;
};

export function RSVPV2({ data, eventId }: RSVPV2Props) {
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
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "var(--sm, 0.85rem)",
              fontWeight: 500,
              letterSpacing: ".18em",
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
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--night, #1e1b17)",
            }}
          >
            {heading}
          </h2>
          {data.description && (
            <p
              style={{
                maxWidth: "56ch",
                color: "var(--text-2, #786f65)",
                lineHeight: 1.75,
                marginTop: 8,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {data.description}
            </p>
          )}
        </div>

        {/* Card wrapper */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r-lg, 24px)",
            boxShadow: "var(--shadow)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Accent top stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72))",
              opacity: 0.7,
            }}
          />

          <div style={{ padding: "clamp(24px, 4vw, 40px)" }}>
            <RSVPForm
              eventId={eventId}
              showMaybeOption={data.showMaybeOption}
              plusOnesAllowed={data.allowPlusOnes ? data.maxPlusOnes : 0}
              successMessage={data.successMessage}
              hideCard
            />
          </div>
        </div>
      </div>
    </section>
  );
}
