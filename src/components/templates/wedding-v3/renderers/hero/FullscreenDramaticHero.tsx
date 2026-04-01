"use client";

/**
 * Fullscreen Dramatic Hero — The Grand Luxe
 *
 * Bold, cinematic, high-contrast. Full-viewport dark image with
 * large white text and metallic accent details. The hero that
 * makes an entrance — unmistakably dramatic.
 */

import type { HeroRendererProps } from "../../types";
import styles from "./FullscreenDramaticHero.module.css";

export function FullscreenDramaticHero({
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
      {heroAsset?.publicUrl ? (
        <div className={styles.bgImage}>
          <img src={heroAsset.publicUrl} alt="" loading="eager" />
        </div>
      ) : (
        <div className={styles.bgFallback} aria-hidden="true" />
      )}

      <div className={styles.content}>
        {monogram && <div className={styles.monogram}>{monogram}</div>}

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
