"use client";

/**
 * Arch Framed Hero — The Garden House
 *
 * Hero image inside an arch-shaped mask — the signature shape of
 * this template. Couple names follow an SVG arch path above the
 * image. Glassmorphic info cards flank the arch on desktop
 * (countdown left, schedule right), stacking below on mobile.
 */

import { useCallback } from "react";
import { EventImage } from "@/components/media/EventImage";
import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import { showHeroCountdown } from "../../hero-card-visibility";
import { resolveRsvpDeadlineDisplay } from "@/lib/utils";
import styles from "./ArchFramedHero.module.css";

export function ArchFramedHero({
  config,
  heroAsset,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
  eventTimezone,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, monogram, rsvpDeadline } = config;
  const temporal = useTemporal();

  const hasNames = !!coupleNames?.trim();

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

  // 3D tilt on mouse move — perspective + rotateX/Y from cursor position
  const handleTiltMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -8;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
    },
    [],
  );

  const handleTiltLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = "";
    },
    [],
  );

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Ambient color wash for glassmorphic depth */}
      <div className={styles.ambient} aria-hidden="true" />

      {/* SVG arch text — couple names on a curved path */}
      {hasNames ? (
        <>
          <h1 className={styles.srOnly}>{coupleNames}</h1>
          <div className={styles.archTextWrap} aria-hidden="true">
            <svg
              className={styles.archTextSvg}
              viewBox="0 0 400 75"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <path
                  id="gh-name-arc"
                  d="M 25,65 Q 200,5 375,65"
                  fill="none"
                />
              </defs>
              <text className={styles.archNameText}>
                <textPath
                  href="#gh-name-arc"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {coupleNames}
                </textPath>
              </text>
            </svg>
          </div>
        </>
      ) : title ? (
        <h1 className={styles.titleOnly}>{title}</h1>
      ) : null}

      {/* Three-column layout: countdown | arch | schedule */}
      <div className={styles.heroContent}>
        {/* Left slot: Countdown card */}
        <div className={`${styles.glassSlot} ${styles.slotLeft}`}>
          {showCountdown && (
            <div
              className={styles.glassCard}
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
            >
              <span className={styles.cardLabel}>Countdown</span>
              <div className={styles.countdownGrid}>
                <div className={styles.countUnit}>
                  <span className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.days)}
                  </span>
                  <span className={styles.countSuffix}>days</span>
                </div>
                <div className={styles.countUnit}>
                  <span className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.hours).padStart(2, "0")}
                  </span>
                  <span className={styles.countSuffix}>hrs</span>
                </div>
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
        </div>

        {/* Center: Arch image */}
        <div className={styles.archContainer}>
          <div className={styles.archMask}>
            {heroAsset?.publicUrl ? (
              <EventImage
                src={heroAsset.publicUrl}
                alt=""
                fill
                sizes="100vw"
                priority
                blurDataURL={heroAsset.blurDataUrl}
                renditionWidths={heroAsset.renditionWidths}
              />
            ) : (
              <div className={styles.archFallback} aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Right slot: Schedule card */}
        <div className={`${styles.glassSlot} ${styles.slotRight}`}>
          {showSchedule && (
            <div
              className={styles.glassCard}
              onMouseMove={handleTiltMove}
              onMouseLeave={handleTiltLeave}
            >
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
      </div>

      {/* Below-arch text */}
      <div className={styles.textBlock}>
        {monogram && <div className={styles.monogram}>{monogram}</div>}
        {subtitle && <p className={styles.dateText}>{subtitle}</p>}
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
