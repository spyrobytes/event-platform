"use client";

/**
 * Fullscreen Dramatic Hero — The Grand Luxe
 *
 * Bold, cinematic, high-contrast. Full-viewport dark image with
 * large white text and metallic accent details. Dark glassmorphic
 * info cards (countdown + schedule) anchored at the bottom of
 * the viewport. The hero that makes an entrance.
 */

import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import styles from "./FullscreenDramaticHero.module.css";

export function FullscreenDramaticHero({
  config,
  heroAsset,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram, rsvpDeadline } = config;
  const temporal = useTemporal();

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];
  const hasNames = nameLines.length > 0;

  // Countdown
  const countdown = (() => {
    if (!temporal?.shouldShowCountdown || !temporal.timeRemaining) return null;
    const { days, hours, minutes } = temporal.timeRemaining;
    return { days, hours, minutes };
  })();

  // RSVP deadline
  const resolvedRsvpDeadline =
    rsvpDeadline ||
    (eventRsvpDeadline
      ? new Date(eventRsvpDeadline).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : undefined);

  const showCountdown = !!countdown;
  const showSchedule = !!(scheduleCards && scheduleCards.length > 0);
  const showCards = showCountdown || showSchedule;

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
            <a href="#details" className={styles.ctaBtn}>
              View Details
            </a>
          </div>
        )}
      </div>

      {/* Dark glassmorphic info cards at bottom of hero */}
      {showCards && (
        <div className={styles.infoRow}>
          {showCountdown && (
            <div className={styles.infoCard}>
              <span className={styles.cardLabel}>Countdown</span>
              <div className={styles.countdownRow}>
                <div className={styles.countUnit}>
                  <span className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.days)}
                  </span>
                  <span className={styles.countSuffix}>days</span>
                </div>
                <span className={styles.countSep} aria-hidden="true">
                  :
                </span>
                <div className={styles.countUnit}>
                  <span className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.hours).padStart(2, "0")}
                  </span>
                  <span className={styles.countSuffix}>hrs</span>
                </div>
                <span className={styles.countSep} aria-hidden="true">
                  :
                </span>
                <div className={styles.countUnit}>
                  <span className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.minutes).padStart(2, "0")}
                  </span>
                  <span className={styles.countSuffix}>min</span>
                </div>
              </div>
              {resolvedRsvpDeadline && (
                <span className={styles.cardNote} suppressHydrationWarning>
                  RSVP by {resolvedRsvpDeadline}
                </span>
              )}
            </div>
          )}

          {showSchedule && (
            <div className={styles.infoCard}>
              <span className={styles.cardLabel}>The Evening</span>
              <div className={styles.schedRows}>
                {scheduleCards.slice(0, 4).map((row, i) => (
                  <div key={i} className={styles.schedRow}>
                    <span className={styles.schedTime}>{row.day}</span>
                    <span className={styles.schedTitle}>{row.info}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
