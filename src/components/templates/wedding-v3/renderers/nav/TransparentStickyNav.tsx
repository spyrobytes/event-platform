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
  // CTA items (RSVP, Album) render as accent links on the right;
  // remaining sections render in the center cluster.
  const ctaSections = sections.filter((s) => s.isCta);

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
            .filter((s) => !s.isCta)
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

        {/* Right cluster: CTA pills (RSVP, Album) + mobile-only hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {ctaSections.map((s) => (
            <a
              key={s.id}
              href={s.href ?? `#${s.id}`}
              className={styles.rsvpLink}
            >
              {s.label}
            </a>
          ))}
          <MobileNavMenu
            className="ed-nav-mobile-menu"
            brand={coupleNames || "Our Wedding"}
            items={[...sections, ...overflow].map((s) => ({
              id: s.id,
              label: s.label,
              href: s.href ?? `#${s.id}`,
              isCta: s.isCta ?? false,
            }))}
            buttonStyle={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.85)",
              background: "transparent",
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
