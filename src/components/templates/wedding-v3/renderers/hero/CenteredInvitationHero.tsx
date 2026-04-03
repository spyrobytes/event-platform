"use client";

/**
 * Centered Invitation Hero — The Fine Art Romance
 *
 * A translucent invitation card centered over a softened hero image.
 * Corner ornaments frame the couple's names. Monogram/crest above,
 * date beneath, event info cards (countdown + schedule) below.
 * Like opening a luxury envelope with all the details inside.
 */

import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import styles from "./CenteredInvitationHero.module.css";

export function CenteredInvitationHero({
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
                  <span className={styles.countSep}>·</span>
                  <div className={styles.countUnit}>
                    <span className={styles.countNum} suppressHydrationWarning>
                      {String(countdown.hours).padStart(2, "0")}
                    </span>
                    <span className={styles.countSuffix}>hrs</span>
                  </div>
                  <span className={styles.countSep}>·</span>
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
            <a href="#details" className={styles.ctaBtn}>
              View Details
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
