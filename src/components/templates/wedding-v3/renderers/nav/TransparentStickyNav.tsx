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
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";
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

        {/* Right cluster: RSVP (always) + mobile-only hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {hasRsvp && (
            <a href="#rsvp" className={styles.rsvpLink}>
              RSVP
            </a>
          )}
          <MobileNavMenu
            className="ed-nav-mobile-menu"
            items={[
              ...sections.filter((s) => s.id !== "rsvp"),
              ...overflow,
            ].map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
            buttonStyle={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.85)",
              background: "transparent",
              cursor: "pointer",
            }}
            menuStyle={{
              background: "var(--text, #2a2622)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            itemStyle={{
              fontFamily: "var(--sans)",
              fontSize: "0.72rem",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.85)",
              padding: "10px 16px",
            }}
          />
        </div>
      </div>
      <style>{`
        .ed-nav-mobile-menu { display: none !important; }
        @media (max-width: 768px) {
          .ed-nav-mobile-menu { display: inline-flex !important; }
        }
      `}</style>
    </nav>
  );
}
