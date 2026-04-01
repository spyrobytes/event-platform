"use client";

/**
 * Arch Framed Hero — The Garden House
 *
 * Hero image inside an arch-shaped mask — the signature shape of
 * this template. Organic, warm, like looking through a garden gate.
 * Centered composition with text beneath the arch.
 */

import type { HeroRendererProps } from "../../types";
import styles from "./ArchFramedHero.module.css";

export function ArchFramedHero({
  config,
  heroAsset,
  hasDetailsSection = false,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram } = config;

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];
  const hasNames = nameLines.length > 0;

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Arch-masked image */}
      <div className={styles.archContainer}>
        <div className={styles.archMask}>
          {heroAsset?.publicUrl ? (
            <img src={heroAsset.publicUrl} alt="" loading="eager" />
          ) : (
            <div className={styles.archFallback} aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Text below arch */}
      <div className={styles.textBlock}>
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

        {subtitle && <p className={styles.dateText}>{subtitle}</p>}

        {hasDetailsSection && (
          <div className={styles.cta}>
            <a href="#details" className={styles.ctaBtn}>View Details</a>
          </div>
        )}
      </div>
    </section>
  );
}
