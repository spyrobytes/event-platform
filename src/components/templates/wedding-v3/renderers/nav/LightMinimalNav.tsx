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
}: NavRendererProps) {
  const hasRsvp = sections.some((s) => s.id === "rsvp");

  // Show all sections except RSVP (shown separately on right)
  const navSections = sections.filter((s) => s.id !== "rsvp");

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

        {/* Right cluster: RSVP (always) + mobile-only hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {hasRsvp && (
            <a href="#rsvp" className={styles.rsvpLink}>
              RSVP
            </a>
          )}
          <MobileNavMenu
            className="im-nav-mobile-menu"
            brand={monogram || (coupleNames ? coupleNames.charAt(0) : "W")}
            items={[...navSections, ...overflow, ...(hasRsvp ? [{ id: "rsvp", label: "RSVP", href: "#rsvp" }] : [])].map((s) => ({
              id: s.id,
              label: s.label,
              href: s.href ?? `#${s.id}`,
              isCta: s.id === "rsvp",
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
