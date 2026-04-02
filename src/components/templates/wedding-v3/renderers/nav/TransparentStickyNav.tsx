"use client";

/**
 * Editorial Nav — The Editorial
 *
 * Always-dark nav bar matching the footer. Clean typographic
 * navigation with center-out underline hover effect.
 * Creates a dark header/footer frame around light content.
 */

import type { NavRendererProps } from "../../types";
import styles from "./TransparentStickyNav.module.css";

export function TransparentStickyNav({
  coupleNames,
  dateText,
  sections,
}: NavRendererProps) {
  // Filter for key nav sections (keep it editorial-sparse)
  const navSections = sections.filter((s) =>
    ["story", "gallery", "details", "schedule", "travel", "rsvp"].includes(s.id)
  );

  const hasRsvp = sections.some((s) => s.id === "rsvp");

  return (
    <nav className={styles.nav} aria-label="Main navigation">
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
