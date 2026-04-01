"use client";

/**
 * Asymmetric Hero — The Editorial
 *
 * Magazine-spread layout: oversized image commands the left 57%,
 * elegant typography occupies the right 43%. The split creates
 * visual tension and asymmetry — like the opening spread of a
 * luxury fashion publication.
 *
 * Couple names are rendered one per line in large serif type.
 * A thin horizontal rule separates names from date/location.
 * CTA is an understated text link with arrow, not a button.
 *
 * On mobile: stacks vertically with image on top (60svh).
 */

import type { HeroRendererProps } from "../../types";
import styles from "./AsymmetricHero.module.css";

export function AsymmetricHero({
  config,
  heroAsset,
  hasDetailsSection = false,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram } = config;

  // Split couple names on "&" for line-by-line rendering
  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];

  const hasNames = nameLines.length > 0;

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Left: Image panel */}
      <div className={styles.imagePanel}>
        {heroAsset?.publicUrl ? (
          <img
            src={heroAsset.publicUrl}
            alt=""
            loading="eager"
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true" />
        )}
      </div>

      {/* Right: Text panel */}
      <div className={styles.textPanel}>
        {/* Monogram */}
        {monogram && (
          <div className={styles.monogram}>{monogram}</div>
        )}

        {/* Couple names — one per line with ampersand between */}
        {hasNames ? (
          <h1 className={styles.names}>
            {nameLines.map((name, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className={styles.nameLine}>
                    <span className={styles.ampersand}>&amp;</span>
                  </span>
                )}
                <span className={styles.nameLine}>{name}</span>
              </span>
            ))}
          </h1>
        ) : (
          <h1 className={styles.titleOnly}>{title}</h1>
        )}

        {/* Thin rule divider */}
        <div className={styles.rule} aria-hidden="true" />

        {/* Date / location info block */}
        {subtitle && (
          <div className={styles.infoBlock}>
            <span className={styles.dateText}>{subtitle}</span>
          </div>
        )}

        {/* CTA — understated text link, editorial style */}
        {hasDetailsSection && (
          <div className={styles.cta}>
            <a href="#details" className={styles.ctaLink}>
              View Details
              <span className={styles.ctaArrow} aria-hidden="true">
                &rarr;
              </span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
