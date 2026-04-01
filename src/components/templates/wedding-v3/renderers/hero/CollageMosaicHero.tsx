"use client";

/**
 * Collage Mosaic Hero — The Celebration House
 *
 * A mosaic grid of photos behind the hero text, creating a
 * vibrant, social, communal feel. Photos fade into a radial
 * gradient, with names and date prominently centered.
 * Names render inline with ampersand (not stacked) — festive tone.
 */

import type { HeroRendererProps } from "../../types";
import type { MediaAsset } from "@prisma/client";
import styles from "./CollageMosaicHero.module.css";

export function CollageMosaicHero({
  config,
  heroAsset,
  hasDetailsSection = false,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram } = config;

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];
  const hasNames = nameLines.length > 0;

  // Use hero image repeated for mosaic effect (real implementation
  // would pull from gallery assets, but we work with what's available)
  const hasImage = !!heroAsset?.publicUrl;

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Background mosaic */}
      {hasImage ? (
        <div className={styles.mosaic} aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <img
              key={i}
              src={heroAsset!.publicUrl!}
              alt=""
              loading="eager"
              style={{
                objectPosition: `${(i % 4) * 25}% ${Math.floor(i / 4) * 33}%`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className={styles.mosaicFallback} aria-hidden="true" />
      )}

      {/* Center content */}
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
