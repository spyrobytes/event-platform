"use client";

import { useState, useEffect } from "react";
import { useScrollThreshold } from "@/hooks/use-scroll-threshold";
import { ShareButton } from "@/components/features/ShareButton";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import {
  MobileNavMenu,
  type MobileNavExpression,
} from "@/components/templates/shared/MobileNavMenu";
import styles from "./Topbar.module.css";

type NavSection = {
  id: string;
  label: string;
  href?: string;
  /** When true, renders this entry as a pill CTA button (filled accent
   *  background, white text). Used for the RSVP entry to make it the
   *  primary action in the topbar. */
  isCta?: boolean;
};

type TopbarProps = {
  monogram?: string;
  coupleNames?: string;
  dateText?: string;
  sections?: NavSection[];
  /** Items that didn't fit in the curated top bar; rendered under a
   *  "More ▾" dropdown on desktop and inlined into the mobile drawer. */
  overflow?: NavSection[];
  accentColor?: string;
  homeHref?: string;
  /** Mobile menu expression. Defaults to "veil" (V2 Cinematic's curated
   *  look); the V3 CinematicNavAdapter forwards the definition's
   *  mobileNavExpression here so a V3 template using this topbar can pick a
   *  different expression instead of being silently locked to veil. */
  mobileNavExpression?: MobileNavExpression;
  /** When true, renders a ShareButton (navigator.share + clipboard fallback)
   *  in the actions slot. Caller is responsible for gating on visibility —
   *  we only render the button when this is true AND a shareUrl is provided.
   *  Defaults to false; consumers must opt in explicitly so this Topbar can
   *  be reused in non-public surfaces (preview, storybook) without leaking
   *  a share affordance. */
  canShare?: boolean;
  /** Title sent to the OS share sheet. Typically the event/couple name. */
  shareTitle?: string;
  /** Canonical URL to share (always /e/[slug], even on sub-pages). */
  shareUrl?: string;
};

/**
 * Topbar — POC-parity rewrite
 *
 * Fixed topbar with monogram circle, brand text, section nav links,
 * RSVP button, copy-link icon, mobile hamburger. Frosted glass
 * background on scroll (NOT hide-on-scroll-down).
 */
export function Topbar({
  monogram,
  coupleNames,
  dateText,
  sections = [],
  overflow = [],
  homeHref,
  mobileNavExpression = "veil",
  canShare = false,
  shareTitle,
  shareUrl,
}: TopbarProps) {
  // Scrolled state: frosted glass after 40px. Hydration-safe hook — the old
  // lazy window.scrollY initializer mismatched the server HTML whenever the
  // page hard-loaded on a `#section` anchor (the browser jumps to the
  // fragment before React hydrates).
  const scrolled = useScrollThreshold(40);
  const [activeSection, setActiveSection] = useState<string>("");

  // Active nav highlight via IntersectionObserver
  useEffect(() => {
    const allIds = [...sections, ...overflow].map((s) => s.id);
    if (allIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -65% 0px", threshold: 0.01 }
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, overflow]);

  return (
    <header
      className={`${styles.topbar} ${scrolled ? styles.scrolled : ""}`}
    >
      <div className={styles.inner}>
        {/* Brand */}
        <a className={styles.brand} href={homeHref ?? "#top"} aria-label="Back to top">
          {monogram && (
            <div className={styles.monogram} aria-hidden="true">
              <span className={styles.monogramLetter}>{monogram}</span>
            </div>
          )}
          <div className={styles.brandText}>
            {coupleNames && (
              <span className={styles.brandNames}>{coupleNames}</span>
            )}
            {dateText && (
              <span className={styles.brandDate}>{dateText}</span>
            )}
          </div>
        </a>

        {/* Desktop nav links */}
        {(sections.length > 0 || overflow.length > 0) && (
          <nav className={styles.nav} aria-label="Page sections">
            {sections.map(({ id, label, href, isCta }) => (
              <a
                key={id}
                href={href ?? `#${id}`}
                className={[
                  styles.navLink,
                  activeSection === id && !isCta ? styles.navLinkActive : "",
                  isCta ? styles.navLinkCta : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </a>
            ))}
            {overflow.length > 0 && (
              <NavMoreDropdown
                items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
                buttonClassName={styles.navLink}
              />
            )}
          </nav>
        )}

        {/* Actions: share + mobile hamburger */}
        <div className={styles.actions}>
          {canShare && shareUrl && (
            <ShareButton
              title={shareTitle || "Event"}
              url={shareUrl}
              className={styles.iconBtn}
              ariaLabel="Share this event"
            />
          )}

          {(sections.length > 0 || overflow.length > 0) && (
            <MobileNavMenu
              className={styles.navToggle}
              // Defaults to the full-screen veil, themed by V2's section
              // themes via the --mnm-veil-* hooks (menuVars in
              // WeddingTemplateV2): Cream is a light veil with dark ink,
              // Midnight a slate one — the cinematic counterpart to Grand
              // Luxe's night veil. The V3 cinematic adapter can override.
              expression={mobileNavExpression}
              // Monogram-first, like Grand Luxe: the veil's brand is
              // display-scale serif with flanking hairlines, and full couple
              // names wrap to two lines at ≤425px (user sweep). Single
              // initial fallback when no monogram is set.
              brand={monogram || (coupleNames ? coupleNames.charAt(0) : "")}
              items={[...sections, ...overflow].map((s) => ({
                id: s.id,
                label: s.label,
                href: s.href ?? `#${s.id}`,
                isCta: s.isCta || s.id === "rsvp",
              }))}
              // Lux-aware: section themes paint the bar via --lux-panel-soft
              // (a Midnight bar is DARK), so the trigger must ride the same
              // ink ramp or it vanishes dark-on-dark — the PR #197 contrast
              // bug class on the current color axis. Cream default unchanged
              // via the fallbacks.
              buttonStyle={{
                width: 40,
                height: 40,
                borderRadius: "var(--r, 16px)",
                border: "1px solid var(--lux-line, var(--border, #e8e1d6))",
                color: "var(--lux-ink-soft, var(--text-2, #786f65))",
                background: "transparent",
              }}
              desktopBreakpoint={900}
            />
          )}
        </div>
      </div>
    </header>
  );
}
