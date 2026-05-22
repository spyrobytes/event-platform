/**
 * High Contrast RSVP — The Grand Luxe
 *
 * Dark-background RSVP panel with metallic accent and
 * inverted color scheme. Dramatic and premium.
 */

import type { RSVPRendererProps } from "../../types";
import { RsvpCta } from "@/components/features/RSVPForm";

export function HighContrastRSVP({ data, eventSlug }: RSVPRendererProps) {
  const heading = data.heading || "RSVP";

  return (
    <section
      style={{
        padding: "var(--section-y, 96px) 0",
        background: "var(--night, #1e1b17)",
        color: "rgba(255,255,255,0.9)",
      }}
      aria-label="RSVP"
      id="rsvp"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--accent, #c5a55a)", marginBottom: 8 }}>
          Respond
        </p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "var(--h2)", fontWeight: 400, color: "#ffffff", marginBottom: "clamp(8px, 1vw, 12px)" }}>
          {heading}
        </h2>
        {data.description && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", color: "rgba(255,255,255,0.6)", lineHeight: 1.75, maxWidth: "48ch", margin: "0 auto clamp(32px, 4vw, 48px)" }}>
            {data.description}
          </p>
        )}

        {/* Card with event recap feel */}
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 4,
            padding: "clamp(28px, 4vw, 44px)",
            textAlign: "left",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent, #c5a55a), transparent)" }} />
          {/* Override the default Button variant's foreground/background:
           *  `text-accent-foreground` (near-black) on its own collapses to
           *  ~1.16 contrast against this dark cinematic card. Bg uses
           *  var(--accent) directly because `bg-accent` resolves via
           *  `rgb(var(--accent))`, which fails inside wedding template
           *  scope where --accent is emitted as a hex string. */}
          <RsvpCta
            eventSlug={eventSlug}
            buttonClassName="text-[var(--text,#1e1b17)] hover:opacity-90 transition-opacity"
            buttonStyle={{ backgroundColor: "var(--accent, #c5a55a)" }}
            helpTextClassName="text-white/70"
          />
        </div>
      </div>
    </section>
  );
}
