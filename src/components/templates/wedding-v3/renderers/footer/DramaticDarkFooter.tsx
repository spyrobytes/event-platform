"use client";

/**
 * Dramatic Dark Footer — The Grand Luxe
 *
 * Dark background footer with metallic accent details.
 * Matches the dramatic tone of the template.
 */

import type { FooterRendererProps } from "../../types";
import { SocialIconRow } from "../../../shared";

export function DramaticDarkFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
  socialLinks,
}: FooterRendererProps) {
  return (
    <footer
      style={{
        background: "var(--night, #1e1b17)",
        padding: "clamp(48px, 6vw, 80px) 0 clamp(24px, 3vw, 40px)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Metallic rule */}
        <div
          style={{ width: 48, height: 2, background: "var(--accent, #c5a55a)", margin: "0 auto clamp(24px, 3vw, 36px)" }}
          aria-hidden="true"
        />

        {monogram && (
          <p style={{ fontFamily: "var(--serif)", fontSize: "1rem", fontWeight: 400, letterSpacing: "0.3em", color: "var(--accent, #c5a55a)", marginBottom: 12 }}>
            {monogram}
          </p>
        )}

        <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(1rem, 1.3vw, 1.15rem)", fontWeight: 400, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
          {coupleNames || "Our Wedding"}
        </p>

        {dateText && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", marginBottom: "clamp(24px, 3vw, 36px)" }}>
            {dateText}
          </p>
        )}

        {sections.length > 0 && (
          <nav style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "clamp(14px, 2vw, 24px)", marginBottom: "clamp(24px, 3vw, 36px)" }} aria-label="Footer navigation">
            {sections.map((s) => (
              <a key={s.id} href={s.href ?? `#${s.id}`} className="gl-footer-link" style={{ fontFamily: "var(--sans)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.3s ease" }}>
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <SocialIconRow
          links={socialLinks}
          size={18}
          gap={12}
          color="rgba(255,255,255,0.45)"
          hoverColor="var(--accent, #c5a55a)"
          style={{ marginBottom: "clamp(20px, 2.5vw, 28px)" }}
        />

        <p style={{ fontFamily: "var(--sans)", fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>
          Powered by Events Fixer
        </p>
      </div>

      {/* Hover styles for footer links */}
      <style>{`
        .gl-footer-link:hover {
          color: var(--accent, #c5a55a) !important;
        }
      `}</style>
    </footer>
  );
}
