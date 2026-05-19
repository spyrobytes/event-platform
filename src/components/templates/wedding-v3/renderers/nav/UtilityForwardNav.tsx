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
import { NavMoreDropdown } from "@/components/templates/shared/NavMoreDropdown";
import styles from "./UtilityForwardNav.module.css";

export function UtilityForwardNav({
  monogram,
  coupleNames,
  sections,
  overflow = [],
  hasHeroImage,
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
  // Observes the hero (#top) alongside all nav sections so that
  // activeSection resets to "top" when the hero is in view,
  // preventing stale highlights on page load or when scrolled to top.
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

    // Observe the hero section so it can clear active nav highlights
    const heroEl = document.getElementById("top");
    if (heroEl) observer.observe(heroEl);

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, overflow]);

  const handleNavClick = () => {
    setMobileNavOpen(false);
  };

  // RSVP keeps its accent-pill styling when present in the curated visible
  // list; everything else (and overflow) renders as a standard nav link.
  const rsvpSection = sections.find((s) => s.id === "rsvp");
  const otherSections = sections.filter((s) => s.id !== "rsvp");

  return (
    <header
      className={`${styles.topbar} ${scrolled ? styles.scrolled : ""} ${hasHeroImage && !scrolled ? styles.overImage : ""}`}
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
              href={s.href ?? `#${s.id}`}
              className={`${styles.navLink} ${activeSection === s.id ? styles.navLinkActive : ""}`}
              onClick={handleNavClick}
            >
              {s.label}
            </a>
          ))}

          {/* Desktop "More ▾" — hidden when the mobile drawer is open
              (drawer renders overflow inline below). */}
          {overflow.length > 0 && !mobileNavOpen && (
            <NavMoreDropdown
              items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
              buttonClassName={styles.navLink}
              onSelect={handleNavClick}
            />
          )}

          {/* Mobile drawer: render overflow as inline links so users can
              reach every nav target without the dropdown affordance. */}
          {overflow.length > 0 && mobileNavOpen && overflow.map((s) => (
            <a
              key={`overflow-${s.id}`}
              href={s.href ?? `#${s.id}`}
              className={`${styles.navLink} ${activeSection === s.id ? styles.navLinkActive : ""}`}
              onClick={handleNavClick}
            >
              {s.label}
            </a>
          ))}

          {/* RSVP accent pill (kept visually distinct from the standard nav links) */}
          {rsvpSection && (
            <a
              key={rsvpSection.id}
              href={rsvpSection.href ?? `#${rsvpSection.id}`}
              className={`${styles.priorityLink} ${styles.priorityRsvp}`}
              onClick={handleNavClick}
            >
              {rsvpSection.label}
            </a>
          )}
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
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
