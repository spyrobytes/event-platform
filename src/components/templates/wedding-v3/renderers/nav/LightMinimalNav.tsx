"use client";

/**
 * Light Minimal Nav — The Intimate Note
 *
 * Always-visible dark nav bar matching the footer. Monogram in
 * concentric circles on left (clickable to hero), section links
 * in center, RSVP on right. Center-out underline hover.
 */

import type { NavRendererProps } from "../../types";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";
import styles from "./LightMinimalNav.module.css";

export function LightMinimalNav({
  monogram,
  coupleNames,
  sections,
  overflow = [],
  homeHref = "#top",
  mobileNavExpression,
}: NavRendererProps) {
  // CTA items (RSVP, Album) render as accent links on the right;
  // remaining sections render in the center cluster.
  const ctaSections = sections.filter((s) => s.isCta);
  const navSections = sections.filter((s) => !s.isCta);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        {/* Left: monogram logo in concentric circles */}
        <a href={homeHref} className={styles.monogramLink} aria-label="Back to top">
          <span className={styles.monogram}>
            {monogram || (coupleNames ? coupleNames.charAt(0) : "W")}
          </span>
        </a>

        {/* Center: section links */}
        {(navSections.length > 0 || overflow.length > 0) && (
          <ul className={styles.links}>
            {navSections.map((s) => (
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
        )}

        {/* Right cluster: CTA pills (RSVP, Album) + mobile-only hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
            className="im-nav-mobile-menu"
            // Invitation sheet, curated by the definition (INTIMATE_NOTE
            // declares mobileNavExpression — a small note card suits the
            // template's quiet, personal register).
            expression={mobileNavExpression}
            brand={monogram || (coupleNames ? coupleNames.charAt(0) : "W")}
            items={[...navSections, ...overflow, ...ctaSections].map((s) => ({
              id: s.id,
              label: s.label,
              href: s.href ?? `#${s.id}`,
              isCta: s.isCta ?? false,
            }))}
            buttonStyle={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.35)",
              color: "rgba(255,255,255,0.85)",
              background: "transparent",
            }}
            desktopBreakpoint={640}
          />
        </div>
      </div>
      <style>{`
        .im-nav-mobile-menu { display: none !important; }
        @media (max-width: 640px) {
          .im-nav-mobile-menu { display: inline-flex !important; }
        }
      `}</style>
    </nav>
  );
}
