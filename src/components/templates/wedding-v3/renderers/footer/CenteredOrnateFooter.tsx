"use client";

/**
 * Centered Ornate Footer — The Fine Art Romance
 *
 * Centered footer with decorative rule, monogram, and
 * symmetrical nav links. Matches the invitation aesthetic.
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
        {/* Decorative rule */}
        <div
          style={{
            width: 64,
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent, #7a8c72), transparent)",
            margin: "0 auto clamp(24px, 3vw, 36px)",
            opacity: 0.5,
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
              color: "var(--accent, #7a8c72)",
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
            color: "var(--text, #3d3830)",
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
              color: "var(--text-3, #a69e93)",
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
                      background: "var(--accent, #7a8c72)",
                      opacity: 0.3,
                    }}
                    aria-hidden="true"
                  />
                )}
                <a
                  href={`#${s.id}`}
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    color: "var(--text-2, #786f65)",
                    textDecoration: "none",
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
            color: "var(--text-3, #a69e93)",
          }}
        >
          Powered by Events Fixer
        </p>
      </div>
    </footer>
  );
}
