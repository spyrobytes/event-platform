"use client";

/**
 * Fullscreen Dramatic Hero — The Grand Luxe
 *
 * Bold, cinematic, high-contrast. Full-viewport dark image with
 * large white text and metallic accent details. Dark glassmorphic
 * info cards (countdown + schedule) anchored at the bottom of
 * the viewport. The hero that makes an entrance.
 */

import { EventImage } from "@/components/media/EventImage";
import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import { resolveRsvpDeadlineDisplay } from "@/lib/utils";
import styles from "./FullscreenDramaticHero.module.css";

export function FullscreenDramaticHero({
  config,
  heroAsset,
  couplePhotoAsset,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
  eventTimezone,
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

  const resolvedRsvpDeadline = resolveRsvpDeadlineDisplay(
    rsvpDeadline,
    eventRsvpDeadline,
    eventTimezone
  );

  const showCountdown = !!countdown;
  const showSchedule = !!(scheduleCards && scheduleCards.length > 0);
  const showCards = showCountdown || showSchedule;

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {heroAsset?.publicUrl ? (
        <div className={styles.bgImage}>
          <EventImage
            src={heroAsset.publicUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            blurDataURL={heroAsset.blurDataUrl}
          />
        </div>
      ) : (
        <div className={styles.bgFallback} aria-hidden="true" />
      )}

      {/* Couple portrait — top left, heart-clipped */}
      {couplePhotoAsset?.publicUrl && (
        <>
          {/* Shared clipPath defs for the heart frame. clipPathUnits=objectBoundingBox
              normalizes the path to 0..1, so the clip scales with any container size. */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="0"
            height="0"
            style={{ position: "absolute", pointerEvents: "none" }}
          >
            <defs>
              <clipPath id="gl-heart-clip" clipPathUnits="objectBoundingBox">
                {/* Shallow-notch heart: valley at y=0.10 (not 0.20) so the top
                 *  of a head-and-shoulders portrait isn't clipped by the V
                 *  between the two lobes. */}
                <path d="M0.5,0.88 C0.3,0.72 0.04,0.56 0.04,0.32 C0.04,0.14 0.18,0.04 0.32,0.04 C0.42,0.04 0.48,0.08 0.5,0.12 C0.52,0.08 0.58,0.04 0.68,0.04 C0.82,0.04 0.96,0.14 0.96,0.32 C0.96,0.56 0.7,0.72 0.5,0.88 Z" />
              </clipPath>
            </defs>
          </svg>
          <div className={styles.couplePhoto}>
            <EventImage
              src={couplePhotoAsset.publicUrl}
              alt={coupleNames || "Couple"}
              fill
              sizes="100vw"
              priority
              blurDataURL={couplePhotoAsset.blurDataUrl}
            />
          </div>
        </>
      )}

      <div className={styles.content}>
        {monogram && <div className={styles.monogram}>{monogram}</div>}

        {hasNames ? (
          <h1 className={styles.names}>
            {nameLines.map((name, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className={styles.ampersand}>&nbsp;&amp;&nbsp;</span>
                )}
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
