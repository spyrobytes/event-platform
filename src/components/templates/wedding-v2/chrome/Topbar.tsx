"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./Topbar.module.css";

type NavSection = {
  id: string;
  label: string;
};

type TopbarProps = {
  monogram?: string;
  coupleNames?: string;
  dateText?: string;
  sections?: NavSection[];
  accentColor?: string;
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
    if (sections.length === 0) return;

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

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback: silently fail
    }
  };

  const handleNavClick = () => {
    setMobileNavOpen(false);
  };

  return (
    <header
      className={`${styles.topbar} ${scrolled ? styles.scrolled : ""}`}
    >
      <div className={styles.inner}>
        {/* Brand */}
        <a className={styles.brand} href="#top" aria-label="Back to top">
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
        {sections.length > 0 && (
          <nav
            className={`${styles.nav} ${mobileNavOpen ? styles.navOpen : ""}`}
            aria-label="Page sections"
          >
            {sections.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={`${styles.navLink} ${activeSection === id ? styles.navLinkActive : ""}`}
                onClick={handleNavClick}
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            onClick={handleCopyLink}
            title="Copy page link"
            aria-label="Copy page link"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              width={18}
              height={18}
            >
              <path d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 5.43" />
              <path d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07L12.5 18.57" />
            </svg>
          </button>

          {sections.length > 0 && (
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

          <a href="#rsvp" className={styles.rsvpBtn}>
            RSVP
          </a>
        </div>
      </div>
    </header>
  );
}
