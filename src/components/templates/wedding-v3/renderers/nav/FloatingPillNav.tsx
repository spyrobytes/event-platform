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
  homeHref = "#top",
}: NavRendererProps) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    // Show the pill once the user has clearly begun scrolling past the hero.
    // 0.2 ≈ 20% of viewport height — small enough that the dramatic hero
    // doesn't keep users navless for a full viewport scroll, large enough
    // that the pill doesn't pop on the first wheel-notch.
    setVisible(window.scrollY > window.innerHeight * 0.2);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navSections = sections;
  const displayMonogram =
    monogram || (coupleNames ? coupleNames.charAt(0) : "W");

  return (
    <>
    <nav
      className="gl-nav-pill"
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
        href={homeHref}
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

      {/* Section links (CTA items rendered separately below as accent pills) */}
      {navSections
        .filter((s) => !s.isCta)
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

      {/* CTA accent pills (RSVP, Album) */}
      {navSections
        .filter((s) => s.isCta)
        .map((s) => (
          <a
            key={s.id}
            href={s.href ?? `#${s.id}`}
            className="gl-nav-cta"
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
            {s.label}
          </a>
        ))}

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

      {/* Hover + mobile styles for the desktop pill */}
      <style>{`
        .gl-nav-monogram:hover {
          background: rgba(197, 165, 90, 0.15) !important;
        }
        .gl-nav-link:hover {
          color: var(--accent, #c5a55a) !important;
        }
        .gl-nav-cta:hover {
          filter: brightness(1.15) !important;
        }
        @media (max-width: 768px) {
          /* The pill is for desktop only — the standalone hamburger
             (rendered outside this nav) is the mobile entry point and
             must not be gated on scroll. */
          .gl-nav-pill { display: none !important; }
        }
      `}</style>
    </nav>

    {/* Mobile hamburger — rendered OUTSIDE the scroll-gated pill so it
        is visible immediately on mobile. Pinned top-right at all times. */}
    <MobileNavMenu
      className="gl-nav-mobile-menu"
      brand={displayMonogram}
      items={[...navSections, ...overflow].map((s) => ({
        id: s.id,
        label: s.label,
        href: s.href ?? `#${s.id}`,
        isCta: s.isCta ?? false,
      }))}
      buttonStyle={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.35)",
        color: "rgba(255,255,255,0.92)",
        background: "rgba(30, 27, 23, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    />
    <style>{`
      .gl-nav-mobile-menu {
        display: none !important;
      }
      @media (max-width: 768px) {
        .gl-nav-mobile-menu {
          position: fixed !important;
          top: calc(env(safe-area-inset-top, 0px) + 0.75rem + var(--banner-offset, 0px)) !important;
          right: calc(env(safe-area-inset-right, 0px) + 0.75rem) !important;
          z-index: 101 !important;
          display: inline-flex !important;
        }
      }
    `}</style>
    </>
  );
}
