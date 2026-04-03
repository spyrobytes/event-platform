"use client";

/**
 * Centered Ornate Footer — The Fine Art Romance
 *
 * Dark artistic footer with centered layout. Decorative gradient
 * rule, monogram, couple names, symmetrical nav with dot
 * separators. Matches the dark nav for a cohesive frame.
 */

import type { FooterRendererProps } from "../../types";

export function CenteredOrnateFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
}: FooterRendererProps) {
  return (
    <footer
      style={{
        padding: "clamp(56px, 7vw, 96px) 0 clamp(24px, 3vw, 40px)",
        textAlign: "center",
        background: "var(--text, #3d3830)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Decorative rule */}
        <div
          style={{
            width: 64,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
            margin: "0 auto clamp(24px, 3vw, 36px)",
          }}
          aria-hidden="true"
        />

        {/* Monogram */}
        {monogram && (
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "1.2rem",
              fontWeight: 400,
              fontStyle: "italic",
              color: "rgba(255, 255, 255, 0.5)",
              marginBottom: 12,
            }}
          >
            {monogram}
          </p>
        )}

        {/* Couple names */}
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.85)",
            marginBottom: 8,
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
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              color: "rgba(255, 255, 255, 0.3)",
              marginBottom: "clamp(20px, 2.5vw, 32px)",
            }}
          >
            {dateText}
          </p>
        )}

        {/* Nav links */}
        {sections.length > 0 && (
          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "clamp(12px, 2vw, 20px)",
              marginBottom: "clamp(24px, 3vw, 40px)",
            }}
            aria-label="Footer navigation"
          >
            {sections.map((s, i) => (
              <span key={s.id} style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 2vw, 20px)" }}>
                {i > 0 && (
                  <span
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.2)",
                    }}
                    aria-hidden="true"
                  />
                )}
                <a
                  href={`#${s.id}`}
                  className="ornate-footer-link"
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    color: "rgba(255, 255, 255, 0.45)",
                    textDecoration: "none",
                    paddingBottom: 2,
                    borderBottom: "1px solid transparent",
                    transition: "color 0.3s ease, border-color 0.3s ease",
                  }}
                >
                  {s.label}
                </a>
              </span>
            ))}
          </nav>
        )}

        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.65rem",
            color: "rgba(255, 255, 255, 0.25)",
          }}
        >
          Powered by Events Fixer
        </p>
      </div>

      {/* Hover styles for footer links */}
      <style>{`
        .ornate-footer-link:hover {
          color: rgba(255, 255, 255, 0.85) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
        }
      `}</style>
    </footer>
  );
}
