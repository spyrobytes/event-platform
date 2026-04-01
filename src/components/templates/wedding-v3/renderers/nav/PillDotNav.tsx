"use client";

/**
 * Pill Dot Nav — The Garden House
 *
 * Sticky nav with pill-shaped links and rounded styling.
 * Organic feel with soft corners everywhere. Includes a
 * section-dot scroll indicator on the right edge (desktop).
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";

export function PillDotNav({
  coupleNames,
  sections,
}: NavRendererProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navSections = sections.filter((s) =>
    ["story", "gallery", "details", "schedule", "travel", "party", "registry", "rsvp"].includes(s.id)
  );

  const hasRsvp = sections.some((s) => s.id === "rsvp");

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(16px, 3vw, 32px)",
        background: scrolled ? "var(--bg, #f8f5f0)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border, #e8e1d6)" : "1px solid transparent",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      aria-label="Main navigation"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "var(--max, 1140px)",
          margin: "0 auto",
          height: 60,
        }}
      >
        {/* Brand */}
        <a
          href="#top"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "0.92rem",
            fontWeight: 400,
            color: "var(--text, #3d3830)",
            textDecoration: "none",
          }}
        >
          {coupleNames || "Our Wedding"}
        </a>

        {/* Pill links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {navSections.filter((s) => s.id !== "rsvp").map((s) => (
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
                padding: "6px 14px",
                borderRadius: 999,
                transition: "background 0.3s ease, color 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--cream, #f0ebe3)";
                e.currentTarget.style.color = "var(--text, #3d3830)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-2, #786f65)";
              }}
            >
              {s.label}
            </a>
          ))}

          {hasRsvp && (
            <a
              href="#rsvp"
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "var(--surface, #ffffff)",
                background: "var(--accent, #7a8c72)",
                textDecoration: "none",
                padding: "6px 16px",
                borderRadius: 999,
              }}
            >
              RSVP
            </a>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          nav > div > div:last-child { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
