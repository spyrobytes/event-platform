"use client";

/**
 * Festive Layered Footer — The Celebration House
 *
 * Warm tinted background with layered content. More expressive
 * than other footers — includes a celebratory closing message.
 */

import type { FooterRendererProps } from "../../types";

export function FestiveLayeredFooter({
  monogram,
  coupleNames,
  dateText,
  sections,
}: FooterRendererProps) {
  return (
    <footer
      style={{
        background: "var(--cream, #f0ebe3)",
        padding: "clamp(56px, 7vw, 88px) 0 clamp(24px, 3vw, 40px)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Celebratory closing */}
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
            fontWeight: 500,
            fontStyle: "italic",
            color: "var(--accent, #7a8c72)",
            marginBottom: "clamp(16px, 2vw, 24px)",
          }}
        >
          Let&apos;s celebrate!
        </p>

        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: 4,
          }}
        >
          {coupleNames || "Our Wedding"}
        </p>

        {dateText && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--text-3, #a69e93)", marginBottom: "clamp(24px, 3vw, 36px)" }}>
            {dateText}
          </p>
        )}

        {sections.length > 0 && (
          <nav style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: "clamp(24px, 3vw, 36px)" }} aria-label="Footer navigation">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-2, #786f65)",
                  textDecoration: "none",
                  padding: "4px 12px",
                  borderRadius: "var(--r, 16px)",
                  background: "var(--surface, #ffffff)",
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
    </footer>
  );
}
