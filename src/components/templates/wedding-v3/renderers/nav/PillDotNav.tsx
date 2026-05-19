"use client";

/**
 * Pill Dot Nav — The Garden House
 *
 * Sticky nav with pill-shaped hover backgrounds and organic feel.
 * Monogram logo in a soft circle (echoing the arch motif) links
 * to #top. RSVP gets a highlighted accent pill. Becomes opaque
 * on scroll.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";

export function PillDotNav({
  monogram,
  coupleNames,
  sections,
  overflow = [],
}: NavRendererProps) {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navSections = sections;
  const displayMonogram =
    monogram || (coupleNames ? coupleNames.charAt(0) : "W");

  return (
    <nav
      style={{
        position: "fixed",
        top: "var(--banner-offset, 0px)",
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(16px, 3vw, 32px)",
        background: scrolled ? "var(--bg, #f8f5f0)" : "transparent",
        borderBottom: scrolled
          ? "1px solid var(--border, #e8e1d6)"
          : "1px solid transparent",
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
        {/* Monogram logo */}
        <a
          href="#top"
          className="gh-nav-logo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1.5px solid var(--accent, #7a8c72)",
            background:
              "color-mix(in srgb, var(--accent, #7a8c72) 6%, transparent)",
            textDecoration: "none",
            fontFamily: "var(--serif)",
            fontSize: "0.8rem",
            fontWeight: 400,
            fontStyle: "italic",
            color: "var(--text, #3d3830)",
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}
          aria-label="Back to top"
        >
          {displayMonogram}
        </a>

        {/* Pill links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {navSections.map((s) => (
            <a
              key={s.id}
              href={s.href ?? `#${s.id}`}
              className={
                s.id === "rsvp" ? "gh-nav-rsvp" : "gh-nav-pill"
              }
              style={
                s.id === "rsvp"
                  ? {
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
                      transition: "filter 0.3s ease",
                    }
                  : {
                      fontFamily: "var(--sans)",
                      fontSize: "0.68rem",
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      color: "var(--text-2, #786f65)",
                      textDecoration: "none",
                      padding: "6px 14px",
                      borderRadius: 999,
                      transition:
                        "background 0.3s ease, color 0.3s ease",
                    }
              }
            >
              {s.label}
            </a>
          ))}
          {overflow.length > 0 && (
            <NavMoreDropdown
              items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
              buttonStyle={{
                fontFamily: "var(--sans)",
                fontSize: "0.68rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "var(--text-2, #786f65)",
                padding: "6px 14px",
                borderRadius: 999,
              }}
              menuStyle={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border, #e8e1d6)",
              }}
              itemStyle={{
                fontFamily: "var(--sans)",
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: "var(--text, #3d3830)",
                padding: "0.55rem 0.9rem",
              }}
            />
          )}
        </div>
      </div>

      {/* Hover + mobile styles */}
      <style>{`
        .gh-nav-logo:hover {
          background: color-mix(in srgb, var(--accent, #7a8c72) 14%, transparent) !important;
          border-color: color-mix(in srgb, var(--accent, #7a8c72) 80%, transparent) !important;
        }
        .gh-nav-pill:hover {
          background: var(--cream, #f0ebe3) !important;
          color: var(--text, #3d3830) !important;
        }
        .gh-nav-rsvp:hover {
          filter: brightness(0.88) !important;
        }
        @media (max-width: 768px) {
          nav > div > div:last-child { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
