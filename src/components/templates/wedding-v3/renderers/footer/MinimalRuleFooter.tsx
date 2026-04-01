"use client";

/**
 * Minimal Rule Footer — The Editorial / Intimate Note
 *
 * Clean footer with a single thin rule at top, couple names,
 * navigation links inline, and a subtle credit line.
 * No decorative elements, no skyline — pure typography.
 */

import type { FooterRendererProps } from "../../types";

export function MinimalRuleFooter({
  coupleNames,
  dateText,
  sections,
}: FooterRendererProps) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border, #e8e1d6)",
        padding: "clamp(40px, 5vw, 64px) 0 clamp(24px, 3vw, 40px)",
      }}
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(20px, 3vw, 32px)",
        }}
      >
        {/* Top row: names + date */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)",
              fontWeight: 400,
              color: "var(--text, #3d3830)",
            }}
          >
            {coupleNames || "Our Wedding"}
          </span>
          {dateText && (
            <span
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.72rem",
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: "var(--text-3, #a69e93)",
              }}
            >
              {dateText}
            </span>
          )}
        </div>

        {/* Navigation links */}
        {sections.length > 0 && (
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "clamp(16px, 2vw, 24px)",
            }}
            aria-label="Footer navigation"
          >
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-2, #786f65)",
                  textDecoration: "none",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {/* Credit line */}
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.68rem",
            color: "var(--text-3, #a69e93)",
            letterSpacing: "0.04em",
          }}
        >
          Powered by Events Fixer
        </p>
      </div>
    </footer>
  );
}
