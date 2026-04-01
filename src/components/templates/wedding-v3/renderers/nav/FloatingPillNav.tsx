"use client";

/**
 * Floating Pill Nav — The Grand Luxe
 *
 * Detached floating pill that appears after scrolling past the hero.
 * Dark/translucent background with metallic accent. Persistent RSVP CTA.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";

export function FloatingPillNav({
  coupleNames,
  sections,
}: NavRendererProps) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > window.innerHeight * 0.7);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const navSections = sections.filter((s) =>
    ["details", "gallery", "schedule", "travel", "registry", "rsvp"].includes(s.id)
  );
  const hasRsvp = sections.some((s) => s.id === "rsvp");

  return (
    <nav
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-80px)",
        zIndex: 100,
        background: "rgba(30, 27, 23, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 999,
        padding: "8px 8px 8px 20px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease",
        opacity: visible ? 1 : 0,
      }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <a
        href="#top"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "0.82rem",
          fontWeight: 400,
          color: "rgba(255,255,255,0.85)",
          textDecoration: "none",
          marginRight: 8,
          whiteSpace: "nowrap",
        }}
      >
        {coupleNames || "Our Wedding"}
      </a>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)", marginRight: 4 }} aria-hidden="true" />

      {/* Section links */}
      {navSections.filter((s) => s.id !== "rsvp").map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
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

      {/* RSVP button */}
      {hasRsvp && (
        <a
          href="#rsvp"
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
          }}
        >
          RSVP
        </a>
      )}

      {/* Hide section links on mobile */}
      <style>{`
        @media (max-width: 768px) {
          nav > a:not(:first-child):not(:last-child),
          nav > div[aria-hidden] { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
