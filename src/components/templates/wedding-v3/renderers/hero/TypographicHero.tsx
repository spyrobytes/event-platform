"use client";

/**
 * Typographic Hero — The Intimate Note
 *
 * Text-only hero centered in generous whitespace. Couple names
 * in beautiful serif type, date below, then compact event info
 * cards (countdown + schedule) so visitors have vital info at a glance.
 *
 * Restraint is the design statement — soft opacity fades,
 * thin-bordered cards, no images.
 */

import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import styles from "./TypographicHero.module.css";

export function TypographicHero({
  config,
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

  // RSVP deadline display
  const resolvedRsvpDeadline = rsvpDeadline || (eventRsvpDeadline
    ? new Date(eventRsvpDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : undefined);

  const showCards = !!(countdown || (scheduleCards && scheduleCards.length > 0));

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

        {/* Event info cards */}
        {showCards && (
          <div className={styles.infoCards}>
            {countdown && (
              <div className={styles.infoCard}>
                <span className={styles.cardLabel}>Countdown</span>
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
                  <span className={styles.cardNote} suppressHydrationWarning>
                    RSVP by {resolvedRsvpDeadline}
                  </span>
                )}
              </div>
            )}

            {scheduleCards && scheduleCards.length > 0 && (
              <div className={styles.infoCard}>
                <span className={styles.cardLabel}>The Day</span>
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
