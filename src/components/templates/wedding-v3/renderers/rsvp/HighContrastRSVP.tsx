/**
 * High Contrast RSVP — The Grand Luxe
 *
 * Dark-background RSVP panel with metallic accent and
 * inverted color scheme. Dramatic and premium.
 */

import Link from "next/link";
import type { RSVPRendererProps } from "../../types";
import { Button } from "@/components/ui/button";

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
          {/* Inlined Link+Button rather than using <RsvpCta> so we can override
              the default variant's text-accent-foreground rule, which collapses
              to 1.16 contrast against the dark cinematic background inside the
              wedding template scope. Bg uses var(--accent) directly (the hex)
              instead of bg-accent → rgb(var(--accent)), which fails because
              wedding palettes emit --accent as a hex string.

              ⚠️ Duplicates RsvpCta defaults (URL pattern, label, help text).
              Keep in sync if RsvpCta's API or defaults change — or, when this
              scope rule lifts, extend RsvpCta with a buttonClassName/style
              passthrough so this inline can be removed. */}
          <div className="text-center">
            {/* Public-portal CTA, not inline form. The /e/[slug]/rsvp route
                gates submissions behind an invite code; an inline form on
                this public page would let anyone POST an RSVP. See
                docs/public-event-portal/rsvp-from-public-portal-Implementation-plan-v3.md §1, §11. */}
            <Link href={`/e/${eventSlug}/rsvp`} className="inline-block">
              <Button
                type="button"
                size="lg"
                // `!` forces override of the default variant's
                // text-accent-foreground. cn() may not reliably merge an
                // arbitrary-value class against a named one, so the
                // important keyword is belt-and-suspenders here.
                className="!text-[var(--text,#1e1b17)] hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--accent, #c5a55a)" }}
              >
                RSVP
              </Button>
            </Link>
            <p className="mt-3 text-sm text-white/70">
              Have your invitation code ready.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
