"use client";

/**
 * Asymmetric Hero — The Editorial
 *
 * Magazine-spread layout: oversized image commands the left 57%,
 * elegant typography occupies the right 43%. The split creates
 * visual tension and asymmetry — like the opening spread of a
 * luxury fashion publication.
 *
 * Text pane layout (top → bottom):
 *   Monogram → Couple names → Rule → Date → Info cards (countdown + schedule) → CTA
 *
 * On mobile: stacks vertically with image on top (60svh).
 */

import { EventImage } from "@/components/media/EventImage";
import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import styles from "./AsymmetricHero.module.css";

export function AsymmetricHero({
  config,
  heroAsset,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram, rsvpDeadline } = config;

  const temporal = useTemporal();

  // Split couple names on "&" for line-by-line rendering
  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];

  const hasNames = nameLines.length > 0;

  // Countdown data
  const countdown = (() => {
    if (!temporal?.shouldShowCountdown || !temporal.timeRemaining) return null;
    const { days, hours, minutes } = temporal.timeRemaining;
    return { days, hours, minutes };
  })();

  // Resolve RSVP deadline display text
  const resolvedRsvpDeadline = rsvpDeadline || (eventRsvpDeadline
    ? new Date(eventRsvpDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : undefined);

  // Show cards area if countdown or schedule cards exist
  const showCards = !!(countdown || (scheduleCards && scheduleCards.length > 0));

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Left: Image panel */}
      <div className={styles.imagePanel}>
        {heroAsset?.publicUrl ? (
          <EventImage
            src={heroAsset.publicUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            blurDataURL={heroAsset.blurDataUrl}
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

        {/* Editorial info cards: countdown + schedule */}
        {showCards && (
          <div className={styles.infoCards}>
            {/* Countdown card */}
            {countdown && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardLabel}>Countdown</span>
                <div className={styles.countdownRow}>
                  <div className={styles.countUnit}>
                    <span className={styles.countNum} suppressHydrationWarning>
                      {String(countdown.days)}
                    </span>
                    <span className={styles.countSuffix}>days</span>
                  </div>
                  <span className={styles.countSep}>:</span>
                  <div className={styles.countUnit}>
                    <span className={styles.countNum} suppressHydrationWarning>
                      {String(countdown.hours).padStart(2, "0")}
                    </span>
                    <span className={styles.countSuffix}>hrs</span>
                  </div>
                  <span className={styles.countSep}>:</span>
                  <div className={styles.countUnit}>
                    <span className={styles.countNum} suppressHydrationWarning>
                      {String(countdown.minutes).padStart(2, "0")}
                    </span>
                    <span className={styles.countSuffix}>min</span>
                  </div>
                </div>
                {resolvedRsvpDeadline && (
                  <span className={styles.infoCardNote} suppressHydrationWarning>
                    RSVP by {resolvedRsvpDeadline}
                  </span>
                )}
              </div>
            )}

            {/* Schedule card */}
            {scheduleCards && scheduleCards.length > 0 && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardLabel}>The Weekend</span>
                <div className={styles.schedRows}>
                  {scheduleCards.slice(0, 4).map((row, i) => (
                    <div key={i} className={styles.schedRow}>
                      <span className={styles.schedDay}>{row.day}</span>
                      <span className={styles.schedInfo}>{row.info}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
