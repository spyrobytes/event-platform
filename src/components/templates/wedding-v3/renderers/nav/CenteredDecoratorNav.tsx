"use client";

/**
 * Centered Decorator Nav — The Fine Art Romance
 *
 * Centered navigation with small decorative dot separators between items.
 * Delicate and symmetrical — matches the invitation aesthetic.
 * Collapses to a simple rounded drawer on mobile.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";

export function CenteredDecoratorNav({
  coupleNames,
  sections,
  accentColor,
}: NavRendererProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 100);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navSections = sections.filter((s) =>
    ["story", "gallery", "details", "schedule", "travel", "party", "registry", "rsvp"].includes(s.id)
  );

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(20px, 4vw, 40px)",
        background: scrolled ? "var(--bg, #f8f5f0)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border, #e8e1d6)" : "1px solid transparent",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
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
          gap: 0,
        }}
      >
        {/* Couple name on left (absolute) */}
        <span
          style={{
            position: "absolute",
            left: "clamp(20px, 4vw, 40px)",
            fontFamily: "var(--serif)",
            fontSize: "0.88rem",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--text, #3d3830)",
            opacity: scrolled ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {coupleNames || ""}
        </span>

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
                    background: "var(--accent, #7a8c72)",
                    opacity: 0.4,
                    margin: "0 clamp(10px, 1.5vw, 18px)",
                    flexShrink: 0,
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
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-2, #786f65)",
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

      {/* Hide center links on mobile, show only couple name */}
      <style>{`
        @media (max-width: 768px) {
          nav > div > div:last-child { display: none !important; }
          nav > div > span { position: static !important; opacity: 1 !important; }
          nav > div { justify-content: space-between !important; }
        }
      `}</style>
    </nav>
  );
}
