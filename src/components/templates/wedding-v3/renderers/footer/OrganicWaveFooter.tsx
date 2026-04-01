"use client";

/**
 * Organic Wave Footer — The Garden House
 *
 * Footer with a subtle wavy SVG top edge, centered layout,
 * and warm earthy background tint. Organic and natural.
 */

import type { FooterRendererProps } from "../../types";

export function OrganicWaveFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
}: FooterRendererProps) {
  return (
    <footer style={{ position: "relative" }}>
      {/* Wavy top edge */}
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: "clamp(24px, 4vw, 48px)",
          fill: "var(--cream, #f0ebe3)",
        }}
        aria-hidden="true"
      >
        <path d="M0,60 L0,30 Q180,0 360,30 Q540,60 720,30 Q900,0 1080,30 Q1260,60 1440,30 L1440,60 Z" />
      </svg>

      <div
        style={{
          background: "var(--cream, #f0ebe3)",
          padding: "clamp(32px, 4vw, 56px) 0 clamp(24px, 3vw, 40px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
            margin: "0 auto",
          }}
        >
          {monogram && (
            <p
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.1rem",
                fontWeight: 400,
                color: "var(--accent, #7a8c72)",
                marginBottom: 12,
              }}
            >
              {monogram}
            </p>
          )}

          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
              fontWeight: 400,
              color: "var(--text, #3d3830)",
              marginBottom: 4,
            }}
          >
            {coupleNames || "Our Wedding"}
          </p>

          {dateText && (
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.7rem",
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase" as const,
                color: "var(--text-3, #a69e93)",
                marginBottom: "clamp(20px, 2.5vw, 32px)",
              }}
            >
              {dateText}
            </p>
          )}

          {sections.length > 0 && (
            <nav
              style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "clamp(12px, 2vw, 20px)", marginBottom: "clamp(24px, 3vw, 36px)" }}
              aria-label="Footer navigation"
            >
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    color: "var(--text-2, #786f65)",
                    textDecoration: "none",
                    padding: "4px 10px",
                    borderRadius: 999,
                    transition: "background 0.3s ease",
                  }}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          )}

          <p style={{ fontFamily: "var(--sans)", fontSize: "0.65rem", color: "var(--text-3, #a69e93)" }}>
            Powered by Events Fixer
          </p>
        </div>
      </div>
    </footer>
  );
}
