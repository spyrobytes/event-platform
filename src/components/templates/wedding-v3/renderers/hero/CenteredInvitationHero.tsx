"use client";

/**
 * Centered Invitation Hero — The Fine Art Romance
 *
 * A translucent invitation card centered over a softened hero image.
 * Corner ornaments frame the couple's names. Monogram/crest above,
 * date beneath. Like opening a luxury envelope.
 */

import type { HeroRendererProps } from "../../types";
import styles from "./CenteredInvitationHero.module.css";

export function CenteredInvitationHero({
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
      {/* Background image */}
      {heroAsset?.publicUrl ? (
        <div className={styles.bgImage}>
          <img src={heroAsset.publicUrl} alt="" loading="eager" />
        </div>
      ) : (
        <div className={styles.bgFallback} aria-hidden="true" />
      )}

      {/* Invitation card */}
      <div className={styles.card}>
        {monogram && (
          <>
            <div className={styles.monogram}>{monogram}</div>
            <div className={styles.monogramRule} aria-hidden="true" />
          </>
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
          <div className={styles.infoBlock}>
            <span className={styles.dateText}>{subtitle}</span>
          </div>
        )}

        {hasDetailsSection && (
          <div className={styles.cta}>
            <a href="#details" className={styles.ctaBtn}>
              View Details
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
