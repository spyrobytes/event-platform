"use client";

/**
 * Utility Forward Nav — The Celebration House
 *
 * Prominent utility nav with clear labels and quick-action buttons.
 * More active and functional than other template navs. Mobile-first
 * with a visible quick-action bar for Schedule, Venue, RSVP.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";

export function UtilityForwardNav({
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

  // Priority actions shown as buttons
  const priorityIds = ["schedule", "details", "rsvp"];
  const prioritySections = sections.filter((s) => priorityIds.includes(s.id));
  const otherSections = sections.filter(
    (s) => !priorityIds.includes(s.id) && ["story", "gallery", "travel", "party", "registry"].includes(s.id)
  );

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(16px, 3vw, 24px)",
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
          height: 56,
        }}
      >
        {/* Brand */}
        <a
          href="#top"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "0.92rem",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            textDecoration: "none",
          }}
        >
          {coupleNames || "Our Wedding"}
        </a>

        {/* Section links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {otherSections.map((s) => (
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
                padding: "6px 10px",
                borderRadius: "var(--r, 16px)",
              }}
            >
              {s.label}
            </a>
          ))}

          {/* Priority action buttons */}
          {prioritySections.map((s) => {
            const isRsvp = s.id === "rsvp";
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: isRsvp ? "var(--surface, #ffffff)" : "var(--accent, #7a8c72)",
                  background: isRsvp ? "var(--accent, #7a8c72)" : "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                  textDecoration: "none",
                  padding: "6px 14px",
                  borderRadius: "var(--r, 16px)",
                }}
              >
                {s.label}
              </a>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          nav > div > div { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
