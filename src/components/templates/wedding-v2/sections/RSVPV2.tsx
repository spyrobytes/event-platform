import type { RSVPSection } from "@/schemas/event-page";
import { RsvpCta } from "@/components/features/RSVPForm";

type RSVPV2Props = {
  data: RSVPSection["data"];
  eventSlug: string;
};

/**
 * RSVP V2 — section-theme aware. Colors read `var(--lux-*, <base value>)`, so an
 * unset section theme is byte-identical and an active theme turns the section
 * into a themed panel with a translucent inset card.
 *
 * NOTE: the inner <RsvpCta> is a shared feature component with its own colors;
 * theming its controls on a dark panel is handled separately (PR B), not here.
 */
export function RSVPV2({ data, eventSlug }: RSVPV2Props) {
  const heading = data.heading || "RSVP";
  const kickerText = "RSVP";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", background: "var(--lux-panel, transparent)" }}
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
          {showKicker && (
            <p
              className="v2-kicker"
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--sm, 0.85rem)",
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase" as const,
                color: "var(--lux-accent, var(--accent, #7a8c72))",
                marginBottom: 12,
              }}
            >
              {kickerText}
            </p>
          )}
          <h2
            style={{
              fontFamily: "var(--cursive, var(--serif))",
              fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "var(--lux-ink, var(--night, #1e1b17))",
            }}
          >
            {heading}
          </h2>
          {data.description && (
            <p
              style={{
                maxWidth: "56ch",
                color: "var(--lux-ink-soft, var(--text-2, #786f65))",
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
            background: "var(--lux-card, var(--surface, #ffffff))",
            border: "1px solid var(--lux-line, var(--border, #e8e1d6))",
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
                "linear-gradient(90deg, var(--lux-accent, var(--sage-l, #a8b8a0)), var(--lux-accent, var(--accent, #7a8c72)))",
              opacity: 0.7,
            }}
          />

          <div style={{ padding: "clamp(24px, 4vw, 40px)" }}>
            {/* Ink override only: RsvpCta's template default is dark ink, but
                this template's hero .btnPrimary is white-on-accent — keep the
                two buttons consistent. A themed panel still wins via
                --lux-accent-ink. Background/helpText use RsvpCta's defaults. */}
            <RsvpCta
              eventSlug={eventSlug}
              buttonClassName="text-[var(--lux-accent-ink,#ffffff)] hover:opacity-90 transition-opacity"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
