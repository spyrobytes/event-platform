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
import { MobileNavMenu } from "@/components/templates/shared/MobileNavMenu";
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

        {/* Desktop nav (links + accent RSVP pill + More dropdown) */}
        <nav className={styles.nav} aria-label="Page sections">
          {otherSections.map((s) => (
            <a
              key={s.id}
              href={s.href ?? `#${s.id}`}
              className={`${styles.navLink} ${activeSection === s.id ? styles.navLinkActive : ""}`}
            >
              {s.label}
            </a>
          ))}
          {rsvpSection && (
            <a
              key={rsvpSection.id}
              href={rsvpSection.href ?? `#${rsvpSection.id}`}
              className={`${styles.priorityLink} ${styles.priorityRsvp}`}
            >
              {rsvpSection.label}
            </a>
          )}
          {overflow.length > 0 && (
            <NavMoreDropdown
              items={overflow.map(({ id, label, href }) => ({ id, label, href: href ?? `#${id}` }))}
              buttonClassName={styles.navLink}
            />
          )}
        </nav>

        {/* Mobile menu. */}
        <div className={styles.actions}>
          {(sections.length > 0 || overflow.length > 0) && (
            <MobileNavMenu
              className={styles.navToggle}
              brand={coupleNames || monogram || ""}
              items={[...sections, ...overflow].map((s) => ({
                id: s.id,
                label: s.label,
                href: s.href ?? `#${s.id}`,
                isCta: s.id === "rsvp",
              }))}
              buttonStyle={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid var(--border, #e8e1d6)",
                color: "var(--text-2, #786f65)",
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
