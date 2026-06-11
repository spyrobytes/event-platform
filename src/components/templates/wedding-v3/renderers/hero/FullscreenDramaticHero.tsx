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
import { showHeroCountdown } from "../../hero-card-visibility";
import { CouplePhotoFrame } from "../../../shared/CouplePhotoFrame";
import { isFloatingCouplePhotoActive } from "../../../shared/CouplePhotoFrame/frame-options";
import { cn, resolveRsvpDeadlineDisplay } from "@/lib/utils";
import styles from "./FullscreenDramaticHero.module.css";

export function FullscreenDramaticHero({
  config,
  heroAsset,
  couplePhotoAsset,
  couplePhotoFrame,
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
    if (!showHeroCountdown(config)) return null; // organizer opt-out (unset = visible)
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

  // Portrait background treatment — the hero image IS the subject (couple
  // photo as background): lighter grade, drift off, top-anchored crop (heads
  // never clip), and the floating couple portrait is skipped to keep the
  // hero clean.
  const isPortraitBackdrop = config.backgroundTreatment === "portrait";

  // Resolved by the factory from the definition's couplePhotoFrameOptions;
  // the ?? is a defensive fallback to this hero's original shape.
  const frame = couplePhotoFrame ?? "heart";
  const frameClass = {
    heart: styles.photoHeart,
    circle: styles.photoCircle,
    full: styles.photoFull,
  }[frame];

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {heroAsset?.publicUrl ? (
        <div className={cn(styles.bgImage, isPortraitBackdrop && styles.bgPortrait)}>
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

      {/* Couple portrait — top left, organizer-selected frame shape.
          Skipped in portrait mode: the background already IS the couple. */}
      {couplePhotoAsset?.publicUrl &&
        isFloatingCouplePhotoActive(config.backgroundTreatment) && (
        <CouplePhotoFrame
          frame={frame}
          // Head-and-shoulders portraits (per the editor tips): land the face
          // in the widest band of the heart/circle. Full-length keeps the
          // shared top-anchored default so heads never crop.
          objectPosition={frame === "full" ? undefined : "center 25%"}
          className={cn(styles.couplePhoto, frameClass)}
        >
          <EventImage
            src={couplePhotoAsset.publicUrl}
            alt={coupleNames || "Couple"}
            fill
            sizes="100vw"
            priority
            blurDataURL={couplePhotoAsset.blurDataUrl}
          />
          {/* Rendered as a child (not ::after on the wrapper) so it is
              clipped by the active frame shape — the heart's clip lives on
              an inner element the wrapper pseudo wouldn't be clipped by. */}
          <div className={styles.photoVignette} aria-hidden="true" />
        </CouplePhotoFrame>
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
