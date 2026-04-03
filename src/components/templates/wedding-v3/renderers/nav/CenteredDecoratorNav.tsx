"use client";

/**
 * Centered Decorator Nav — The Fine Art Romance
 *
 * Always-dark nav bar with monogram logo in concentric circles
 * on the left, centered section links with decorative dot
 * separators. Dark background matches footer.
 */

import type { NavRendererProps } from "../../types";

export function CenteredDecoratorNav({
  monogram,
  coupleNames,
  sections,
}: NavRendererProps) {
  const navSections = sections;

  // Derive a monogram fallback from couple names initials
  const displayMonogram = monogram
    || (coupleNames ? coupleNames.charAt(0) : "W");

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(20px, 4vw, 40px)",
        background: "var(--text, #3d3830)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
      aria-label="Main navigation"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "var(--max, 1140px)",
          margin: "0 auto",
          height: 60,
        }}
      >
        {/* Left: Monogram in concentric circles */}
        <a
          href="#top"
          className="fine-art-monogram"
          style={{
            position: "absolute",
            left: "clamp(20px, 4vw, 40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            boxShadow: "0 0 0 4px rgba(255, 255, 255, 0.08)",
            textDecoration: "none",
            fontFamily: "var(--serif)",
            fontSize: "0.82rem",
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "0.06em",
            color: "rgba(255, 255, 255, 0.85)",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          }}
          aria-label="Back to top"
        >
          {displayMonogram}
        </a>

        {/* Centered links with dot separators */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {navSections.map((s, i) => (
            <span key={s.id} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.25)",
                    margin: "0 clamp(10px, 1.5vw, 18px)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
              )}
              <a
                href={`#${s.id}`}
                className="fine-art-nav-link"
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  color: "rgba(255, 255, 255, 0.6)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "color 0.3s ease",
                }}
              >
                {s.label}
              </a>
            </span>
          ))}
        </div>
      </div>

      {/* Hover + mobile styles */}
      <style>{`
        .fine-art-nav-link:hover { color: rgba(255, 255, 255, 0.95) !important; }
        .fine-art-monogram:hover {
          border-color: rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15) !important;
        }
        @media (max-width: 768px) {
          nav > div > div:last-child { display: none !important; }
          nav > div { justify-content: center !important; }
        }
      `}</style>
    </nav>
  );
}
