"use client";

import type { DetailsSection } from "@/schemas/event-page";

type DetailsV2Props = {
  data: DetailsSection["data"];
};

/**
 * Details V2 — POC-parity rewrite
 *
 * Multi-card grid with eyebrow, title, info-rows, accent top stripe.
 * Renders dateText and locationText in a rich card format.
 * Gracefully handles limited data by showing what's available.
 */
export function DetailsV2({ data }: DetailsV2Props) {
  const { dateText, locationText } = data;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Event details"
      id="details"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(32px, 5vw, 56px)" }}>
          <p className="v2-kicker" style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--sm, 0.85rem)",
            fontWeight: 500,
            letterSpacing: ".18em",
            textTransform: "uppercase" as const,
            color: "var(--accent, #7a8c72)",
            marginBottom: 12,
          }}>
            Event Details
          </p>
          <h2 style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--night, #1e1b17)",
          }}>
            Where to be, when to show up
          </h2>
        </div>

        {/* Details grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--gap, 20px)",
        }}>
          {/* Date/Time card */}
          <DetailCard
            eyebrow="When"
            title="Date & Time"
            infoRows={[
              { key: "Date", value: dateText },
            ]}
          />

          {/* Venue card */}
          <DetailCard
            eyebrow="Where"
            title="Venue"
            description={data.venueDescription}
            infoRows={[
              { key: "Location", value: locationText },
            ]}
          />
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 700px) {
          #details [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/** Reusable detail card matching the POC pattern */
function DetailCard({
  eyebrow,
  title,
  description,
  infoRows,
  hint,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  infoRows?: { key: string; value: string }[];
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e8e1d6)",
        borderRadius: "var(--r-lg, 24px)",
        padding: "clamp(24px, 3vw, 32px)",
        boxShadow: "var(--shadow)",
        position: "relative",
        overflow: "hidden",
        transition: "transform .4s var(--ease-out-expo, ease), box-shadow .4s var(--ease-out-expo, ease)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-lg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
    >
      {/* Accent top stripe */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "linear-gradient(90deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72))",
        opacity: 0.7,
      }} />

      <div style={{
        fontSize: ".75rem",
        fontWeight: 600,
        letterSpacing: ".1em",
        textTransform: "uppercase" as const,
        color: "var(--accent, #7a8c72)",
        marginBottom: 6,
      }}>
        {eyebrow}
      </div>

      <h3 style={{
        fontFamily: "var(--serif)",
        fontSize: "1.3rem",
        fontWeight: 400,
        lineHeight: 1.15,
        color: "var(--night, #1e1b17)",
        marginBottom: 10,
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          color: "var(--text-2, #786f65)",
          fontSize: "var(--sm, 0.85rem)",
          lineHeight: 1.65,
          marginBottom: 16,
        }}>
          {description}
        </p>
      )}

      {infoRows && infoRows.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {infoRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                padding: "10px 14px",
                borderRadius: "var(--r, 16px)",
                background: "var(--cream, #f0ebe3)",
                border: "1px solid var(--linen, #e8e1d6)",
                transition: "border-color var(--transition, 0.3s ease)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(122, 140, 114, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--linen, #e8e1d6)";
              }}
            >
              <span style={{ fontSize: "var(--sm, 0.85rem)", color: "var(--text-3, #a69e93)" }}>
                {row.key}
              </span>
              <span style={{ fontSize: "var(--sm, 0.85rem)", fontWeight: 600, color: "var(--charcoal, #3d3830)", textAlign: "right" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {hint && (
        <p style={{
          marginTop: 14,
          fontSize: ".82rem",
          color: "var(--stone, #a69e93)",
          fontStyle: "italic",
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}
