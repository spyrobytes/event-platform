"use client";

/**
 * Utility Forward Nav — The Celebration House
 *
 * Prominent utility nav with section scroll progress (underline on active section),
 * monogram circle linking to hero, clear labels, and quick-action priority buttons.
 * Mobile-first with hamburger drawer.
 */

import { useState, useEffect, useCallback } from "react";
import type { NavRendererProps } from "../../types";
import styles from "./UtilityForwardNav.module.css";

export function UtilityForwardNav({
  monogram,
  coupleNames,
  sections,
}: NavRendererProps) {
  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.scrollY > 80;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Scroll detection for frosted glass
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Active section tracking via IntersectionObserver
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

  const handleNavClick = () => {
    setMobileNavOpen(false);
  };

  // Priority actions shown as buttons
  const priorityIds = ["schedule", "details", "rsvp"];
  const prioritySections = sections.filter((s) => priorityIds.includes(s.id));
  const otherSections = sections.filter(
    (s) => !priorityIds.includes(s.id) && !["top"].includes(s.id)
  );

  return (
    <header
      className={`${styles.topbar} ${scrolled ? styles.scrolled : ""}`}
      aria-label="Main navigation"
    >
      <div className={styles.inner}>
        {/* Brand — monogram circle links to hero */}
        <a className={styles.brand} href="#top" aria-label="Back to top">
          {monogram ? (
            <div className={styles.monogramCircle} aria-hidden="true">
              <span className={styles.monogramLetter}>{monogram}</span>
            </div>
          ) : coupleNames ? (
            <span className={styles.brandNames}>{coupleNames}</span>
          ) : null}
        </a>

        {/* Section nav links with active underline */}
        <nav
          className={`${styles.nav} ${mobileNavOpen ? styles.navOpen : ""}`}
          aria-label="Page sections"
        >
          {otherSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`${styles.navLink} ${activeSection === s.id ? styles.navLinkActive : ""}`}
              onClick={handleNavClick}
            >
              {s.label}
            </a>
          ))}

          {/* Priority action buttons */}
          {prioritySections.map((s) => {
            const isRsvp = s.id === "rsvp";
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`${styles.priorityLink} ${isRsvp ? styles.priorityRsvp : styles.priorityDefault}`}
                onClick={handleNavClick}
              >
                {s.label}
              </a>
            );
          })}
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
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
                width={18}
                height={18}
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
