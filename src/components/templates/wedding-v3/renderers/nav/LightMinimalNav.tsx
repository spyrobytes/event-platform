"use client";

/**
 * Light Minimal Nav — The Intimate Note
 *
 * Barely visible navigation that appears only when scrolled.
 * Just couple names and an RSVP link. No section links — this
 * template is short enough to scroll through naturally.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";

export function LightMinimalNav({
  coupleNames,
  sections,
}: NavRendererProps) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 300);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const hasRsvp = sections.some((s) => s.id === "rsvp");

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 clamp(20px, 4vw, 40px)",
        background: "var(--bg, #f8f5f0)",
        borderBottom: "1px solid var(--border, #e8e1d6)",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: visible ? 1 : 0,
      }}
      aria-label="Main navigation"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "var(--max, 800px)",
          margin: "0 auto",
          height: 52,
        }}
      >
        <a
          href="#top"
          style={{
            fontFamily: "var(--serif)",
            fontSize: "0.9rem",
            fontWeight: 400,
            color: "var(--text, #3d3830)",
            textDecoration: "none",
          }}
        >
          {coupleNames || "Our Wedding"}
        </a>

        {hasRsvp && (
          <a
            href="#rsvp"
            style={{
              fontFamily: "var(--sans)",
              fontSize: "0.72rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "var(--accent, #7a8c72)",
              textDecoration: "none",
            }}
          >
            RSVP
          </a>
        )}
      </div>
    </nav>
  );
}
