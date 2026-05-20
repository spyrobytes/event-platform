"use client";

/**
 * Floating Pill Nav — The Grand Luxe
 *
 * Detached floating pill that appears after scrolling past the hero.
 * Dark/translucent background with metallic accent. Monogram in a
 * sharp metallic-bordered square links to #top. All enabled sections
 * shown. RSVP gets a highlighted accent pill.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";

export function FloatingPillNav({
  monogram,
  coupleNames,
  sections,
  overflow = [],
}: NavRendererProps) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > window.innerHeight * 0.7);
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
        top: "calc(16px + var(--banner-offset, 0px))",
        left: "50%",
        transform: visible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-80px)",
        zIndex: 100,
        background: "rgba(30, 27, 23, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 999,
        padding: "8px 8px 8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        transition:
          "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
        opacity: visible ? 1 : 0,
      }}
      aria-label="Main navigation"
    >
      {/* Monogram in metallic-bordered square */}
      <a
        href="#top"
        className="gl-nav-monogram"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 2,
          border: "1px solid var(--accent, #c5a55a)",
          textDecoration: "none",
          fontFamily: "var(--serif)",
          fontSize: "0.75rem",
          fontWeight: 400,
          color: "var(--accent, #c5a55a)",
          marginRight: 8,
          transition: "background 0.3s ease",
        }}
        aria-label="Back to top"
      >
        {displayMonogram}
      </a>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "rgba(255,255,255,0.15)",
          marginRight: 4,
        }}
        aria-hidden="true"
      />

      {/* Section links (excluding RSVP — rendered separately as accent pill) */}
      {navSections
        .filter((s) => s.id !== "rsvp")
        .map((s) => (
          <a
            key={s.id}
            href={s.href ?? `#${s.id}`}
            className="gl-nav-link"
            style={{
              fontFamily: "var(--sans)",
              fontSize: "0.65rem",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.6)",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              transition: "color 0.3s ease",
            }}
          >
            {s.label}
          </a>
        ))}

      {/* RSVP accent pill */}
      {navSections.some((s) => s.id === "rsvp") && (
        <a
          href="#rsvp"
          className="gl-nav-rsvp"
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "var(--night, #1e1b17)",
            background: "var(--accent, #c5a55a)",
            textDecoration: "none",
            padding: "8px 18px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            transition: "filter 0.3s ease",
          }}
        >
          RSVP
        </a>
      )}

      {/* Desktop overflow dropdown */}
      {overflow.length > 0 && (
        <div className="gl-nav-desktop-more" style={{ display: "inline-flex", alignItems: "center" }}>
          <NavMoreDropdown
            items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
            buttonStyle={{
              fontFamily: "var(--sans)",
              fontSize: "0.65rem",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.6)",
              padding: "6px 10px",
              borderRadius: 999,
            }}
            itemStyle={{
              fontFamily: "var(--sans)",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              padding: "0.6rem 0.9rem",
            }}
          />
        </div>
      )}

      {/* Mobile-only hamburger + full-width drawer. RSVP stays inline as
          the primary CTA on mobile; the drawer surfaces the remaining
          non-RSVP visible items plus overflow. */}
      <MobileNavMenu
        className="gl-nav-mobile-menu"
        items={[
          ...navSections.filter((s) => s.id !== "rsvp"),
          ...overflow,
        ].map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
        buttonStyle={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.25)",
          color: "rgba(255,255,255,0.85)",
          background: "transparent",
          cursor: "pointer",
        }}
        drawerStyle={{
          background: "rgba(30, 27, 23, 0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
        itemStyle={{
          fontFamily: "var(--sans)",
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.85)",
          padding: "14px clamp(20px, 4vw, 40px)",
        }}
        drawerTop="calc(var(--banner-offset, 0px) + 72px)"
      />

      {/* Hover + mobile styles */}
      <style>{`
        .gl-nav-monogram:hover {
          background: rgba(197, 165, 90, 0.15) !important;
        }
        .gl-nav-link:hover {
          color: var(--accent, #c5a55a) !important;
        }
        .gl-nav-rsvp:hover {
          filter: brightness(1.15) !important;
        }
        .gl-nav-mobile-menu { display: none !important; }
        @media (max-width: 768px) {
          .gl-nav-link,
          nav > div[aria-hidden] { display: none !important; }
          .gl-nav-desktop-more { display: none !important; }
          .gl-nav-mobile-menu { display: inline-flex !important; }
        }
      `}</style>
    </nav>
  );
}
