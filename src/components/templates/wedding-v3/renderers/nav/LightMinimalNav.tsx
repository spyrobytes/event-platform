"use client";

/**
 * Light Minimal Nav — The Intimate Note
 *
 * Always-visible dark nav bar matching the footer. Monogram in
 * concentric circles on left (clickable to hero), section links
 * in center, RSVP on right. Center-out underline hover.
 */

import type { NavRendererProps } from "../../types";
import styles from "./LightMinimalNav.module.css";

export function LightMinimalNav({
  monogram,
  coupleNames,
  sections,
}: NavRendererProps) {
  const hasRsvp = sections.some((s) => s.id === "rsvp");

  // Show all sections except RSVP (shown separately on right)
  const navSections = sections.filter((s) => s.id !== "rsvp");

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        {/* Left: monogram logo in concentric circles */}
        <a href="#top" className={styles.monogramLink} aria-label="Back to top">
          <span className={styles.monogram}>
            {monogram || (coupleNames ? coupleNames.charAt(0) : "W")}
          </span>
        </a>

        {/* Center: section links */}
        {navSections.length > 0 && (
          <ul className={styles.links}>
            {navSections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={styles.link}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* Right: RSVP */}
        {hasRsvp && (
          <a href="#rsvp" className={styles.rsvpLink}>
            RSVP
          </a>
        )}
      </div>
    </nav>
  );
}
