"use client";

/**
 * Editorial Nav — The Editorial
 *
 * Always-dark nav bar matching the footer. Clean typographic
 * navigation with center-out underline hover effect.
 * Creates a dark header/footer frame around light content.
 */

import type { NavRendererProps } from "../../types";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import styles from "./TransparentStickyNav.module.css";

export function TransparentStickyNav({
  coupleNames,
  dateText,
  sections,
  overflow = [],
}: NavRendererProps) {
  // Show all enabled sections — factory already filters to enabled-only
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
          {sections
            .filter((s) => s.id !== "rsvp")
            .map((s) => (
              <li key={s.id}>
                <a href={s.href ?? `#${s.id}`} className={styles.link}>
                  {s.label}
                </a>
              </li>
            ))}
          {overflow.length > 0 && (
            <li>
              <NavMoreDropdown
                items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
                buttonClassName={styles.link}
              />
            </li>
          )}
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
