"use client";

/**
 * Typographic Hero — The Intimate Note
 *
 * Text-only hero with no image, no decoration, no cards.
 * Just couple names in beautiful serif type, centered in
 * generous whitespace. The anti-overdesigned hero.
 *
 * Restraint is the design statement. Uses soft opacity fades
 * instead of translate animations — barely-there motion.
 */

import type { HeroRendererProps } from "../../types";
import styles from "./TypographicHero.module.css";

export function TypographicHero({
  config,
  hasDetailsSection = false,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram } = config;

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];

  const hasNames = nameLines.length > 0;

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      <div className={styles.content}>
        {monogram && (
          <div className={styles.monogram}>{monogram}</div>
        )}

        {hasNames ? (
          <h1 className={styles.names}>
            {nameLines.map((name, i) => (
              <span key={i}>
                {i > 0 && <span className={styles.ampersand}>&amp;</span>}
                {name}
              </span>
            ))}
          </h1>
        ) : (
          <h1 className={styles.titleOnly}>{title}</h1>
        )}

        {subtitle && (
          <p className={styles.dateText}>{subtitle}</p>
        )}

        {hasDetailsSection && (
          <div className={styles.cta}>
            <a href="#details" className={styles.ctaLink}>
              View Details
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
