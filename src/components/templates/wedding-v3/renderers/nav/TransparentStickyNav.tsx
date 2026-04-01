"use client";

/**
 * Transparent Sticky Nav — The Editorial
 *
 * Starts fully transparent over the hero, becomes a crisp solid bar
 * with a thin bottom rule on scroll. No frosted glass, no decorative
 * chrome — pure typographic navigation. Feels like a magazine masthead.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";
import styles from "./TransparentStickyNav.module.css";

export function TransparentStickyNav({
  coupleNames,
  dateText,
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

  // Filter for key nav sections (keep it editorial-sparse)
  const navSections = sections.filter((s) =>
    ["story", "gallery", "details", "schedule", "travel", "rsvp"].includes(s.id)
  );

  const hasRsvp = sections.some((s) => s.id === "rsvp");

  return (
    <nav className={styles.nav} data-scrolled={scrolled} aria-label="Main navigation">
      <div className={styles.inner}>
        {/* Left: couple name + date */}
        <div className={styles.brand}>
          <span className={styles.brandName}>
            {coupleNames || "Our Wedding"}
          </span>
          {dateText && (
            <>
              <div className={styles.brandSep} aria-hidden="true" />
              <span className={styles.brandDate}>{dateText}</span>
            </>
          )}
        </div>

        {/* Center: section links */}
        <ul className={styles.links}>
          {navSections
            .filter((s) => s.id !== "rsvp")
            .map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={styles.link}>
                  {s.label}
                </a>
              </li>
            ))}
        </ul>

        {/* Right: RSVP link */}
        {hasRsvp && (
          <a href="#rsvp" className={styles.rsvpLink}>
            RSVP
          </a>
        )}
      </div>
    </nav>
  );
}
