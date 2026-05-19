"use client";

import { useState, useEffect, useCallback } from "react";
import { ShareButton } from "@/components/features/ShareButton";
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
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
  canShare = false,
  shareTitle,
  shareUrl,
}: TopbarProps) {
  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.scrollY > 40;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Scrolled state: frosted glass after 40px
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 40);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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

  const handleNavClick = () => {
    setMobileNavOpen(false);
  };

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

        {/* Section nav links */}
        {(sections.length > 0 || overflow.length > 0) && (
          <nav
            className={`${styles.nav} ${mobileNavOpen ? styles.navOpen : ""}`}
            aria-label="Page sections"
          >
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
                onClick={handleNavClick}
              >
                {label}
              </a>
            ))}
            {/* Desktop "More ▾" — overflow items hidden when the mobile
                 drawer is open (drawer renders them inline below). */}
            {overflow.length > 0 && !mobileNavOpen && (
              <NavMoreDropdown
                items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
                buttonClassName={styles.navLink}
                onSelect={handleNavClick}
              />
            )}
            {/* Mobile drawer: render overflow as inline links so users can
                 reach every nav target without the dropdown affordance. */}
            {overflow.length > 0 && mobileNavOpen && overflow.map(({ id, label, href }) => (
              <a
                key={`overflow-${id}`}
                href={href ?? `#${id}`}
                className={[
                  styles.navLink,
                  activeSection === id ? styles.navLinkActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={handleNavClick}
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        {/* Actions */}
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
            <button
              className={styles.navToggle}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                width={20}
                height={20}
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
