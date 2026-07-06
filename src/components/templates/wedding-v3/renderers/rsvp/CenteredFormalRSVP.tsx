/**
 * Centered Formal RSVP — The Fine Art Romance
 *
 * Centered card with soft depth and decorative accent.
 * Matches the invitation-card aesthetic of the template.
 */

import type { RSVPRendererProps } from "../../types";
import { RsvpCta } from "@/components/features/RSVPForm";

export function CenteredFormalRSVP({ data, eventSlug }: RSVPRendererProps) {
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
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--sm, 0.85rem)",
            fontStyle: "italic",
            color: "var(--accent, #7a8c72)",
            marginBottom: 8,
          }}
        >
          Respond
        </p>
        <h2
          style={{
            fontFamily: "var(--serif)",
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
              maxWidth: "48ch",
              margin: "0 auto clamp(32px, 4vw, 48px)",
            }}
          >
            {data.description}
          </p>
        )}

        {/* Card */}
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #e8e1d6)",
            borderRadius: "var(--r, 16px)",
            boxShadow: "0 2px 24px rgba(0,0,0,0.04)",
            padding: "clamp(28px, 4vw, 44px)",
            position: "relative",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          {/* Top accent gradient */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: 2,
              background: "linear-gradient(90deg, transparent, var(--accent, #7a8c72), transparent)",
              opacity: 0.5,
            }}
          />
          {/* Explicit colors: Button's `bg-accent` reads the app-shell RGB
              triplet, but template scope redefines --accent as a hex, so the
              utility computes to transparent here. Same guard as
              HighContrastRSVP. */}
          <RsvpCta
            eventSlug={eventSlug}
            buttonClassName="text-[var(--lux-accent-ink,var(--surface,#ffffff))] hover:opacity-90 transition-opacity"
            buttonStyle={{ backgroundColor: "var(--lux-accent, var(--accent, #7a8c72))" }}
            helpTextClassName="text-[var(--lux-ink-soft,var(--text-2,#786f65))]"
          />
        </div>
      </div>
    </section>
  );
}
