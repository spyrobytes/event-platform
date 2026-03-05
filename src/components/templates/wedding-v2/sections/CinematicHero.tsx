"use client";

import { useRef, useEffect, useCallback } from "react";
import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { useTemporal } from "../../shared";
import styles from "./CinematicHero.module.css";

type ScheduleCard = { day: string; info: string };

type CinematicHeroProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  primaryColor: string;
  scheduleCards?: ScheduleCard[];
};

/**
 * Cinematic Hero — POC-parity rewrite
 *
 * Bottom-aligned content, complex ivory gradient overlay,
 * word-by-word staggered title, eyebrow with decorative lines,
 * CTA buttons, and two glass float-cards (countdown + schedule).
 */
export function CinematicHero({
  config,
  heroAsset,
  primaryColor: _primaryColor,
  scheduleCards: scheduleCardsProp,
}: CinematicHeroProps) {
  const {
    title,
    subtitle,
    style: heroStyle = "standard",
    showCountdown = false,
    showScheduleCards = false,
    coupleNames,
  } = config;

  const temporal = useTemporal();
  const imgRef = useRef<HTMLImageElement>(null);

  const isCinematic = heroStyle === "cinematic";

  // Subtle parallax on hero image
  const handleParallax = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const hero = img.closest("section");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) return;
    const progress = Math.max(0, -rect.top / (rect.height * 0.5));
    img.style.transform = `translateY(${progress * 40}px) scale(${1 + progress * 0.02})`;
  }, []);

  useEffect(() => {
    if (!isCinematic) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    window.addEventListener("scroll", handleParallax, { passive: true });
    return () => window.removeEventListener("scroll", handleParallax);
  }, [isCinematic, handleParallax]);

  // Countdown data
  const countdown = (() => {
    if (!showCountdown || !temporal?.shouldShowCountdown || !temporal.timeRemaining) return null;
    const { days, hours, minutes } = temporal.timeRemaining;
    return { days, hours, minutes };
  })();

  // Split couple names into words for staggered animation
  const nameWords = coupleNames
    ? coupleNames.split(/(\s*&\s*)/).filter(Boolean)
    : [];

  // Date text for eyebrow — use subtitle as date text
  const dateText = subtitle || "";

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Background image with gradient overlay */}
      {heroAsset?.publicUrl ? (
        <div className={styles.heroMedia} aria-hidden="true">
          <img
            ref={imgRef}
            src={heroAsset.publicUrl}
            alt=""
            loading="eager"
          />
        </div>
      ) : (
        <div className={styles.heroFallback} aria-hidden="true" />
      )}

      {/* Content — bottom-aligned via parent flex-end */}
      <div
        className={styles.heroContent}
        style={{ width: `min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))`, margin: "0 auto" }}
      >
        <div className={styles.heroText}>
          {/* Eyebrow */}
          {dateText && (
            <div className={styles.eyebrow}>{dateText}</div>
          )}

          {/* Title — word-by-word stagger for cinematic mode */}
          {isCinematic && coupleNames ? (
            <h1 className={styles.title}>
              {nameWords.map((word, i) => {
                const trimmed = word.trim();
                const isAmpersand = trimmed === "&";
                return (
                  <span key={i} className={styles.word}>
                    {isAmpersand ? (
                      <>&amp; </>
                    ) : (
                      <em className={styles.wordEmphasis}>{trimmed} </em>
                    )}
                  </span>
                );
              })}
            </h1>
          ) : (
            <h1 className={styles.title}>
              <span className={styles.word}>
                <em className={styles.wordEmphasis}>{title}</em>
              </span>
            </h1>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}

          {/* CTA buttons */}
          {isCinematic && (
            <div className={styles.cta}>
              <a href="#rsvp" className={`${styles.btn} ${styles.btnPrimary}`}>
                RSVP Now
              </a>
              <a href="#details" className={`${styles.btn} ${styles.btnOutline}`}>
                View Details
              </a>
            </div>
          )}
        </div>

        {/* Float cards: countdown + schedule */}
        {isCinematic && (countdown || showScheduleCards) && (
          <div className={styles.heroCards}>
            {/* Countdown card */}
            {countdown && (
              <CountdownCard countdown={countdown} />
            )}

            {/* Schedule card */}
            {showScheduleCards && (
              <ScheduleFloatCard scheduleCards={scheduleCardsProp} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Glass-morph countdown card with animated digits.
 * Uses key-based re-mounting to trigger CSS flip animation on value change. */
function CountdownCard({
  countdown,
}: {
  countdown: { days: number; hours: number; minutes: number };
}) {
  const dStr = String(countdown.days);
  const hStr = String(countdown.hours).padStart(2, "0");
  const mStr = String(countdown.minutes).padStart(2, "0");

  return (
    <div className={styles.floatCard}>
      <div className={styles.floatCardHead}>
        <span className={styles.floatCardLabel}>Countdown</span>
      </div>
      <div className={styles.countdown}>
        <div className={styles.countUnit}>
          <div key={dStr} className={styles.countNum}>
            {dStr}
          </div>
          <div className={styles.countLabel}>days</div>
        </div>
        <div className={styles.countUnit}>
          <div key={hStr} className={styles.countNum}>
            {hStr}
          </div>
          <div className={styles.countLabel}>hours</div>
        </div>
        <div className={styles.countUnit}>
          <div key={mStr} className={styles.countNum}>
            {mStr}
          </div>
          <div className={styles.countLabel}>min</div>
        </div>
      </div>
      <div className={styles.floatCardFooter}>
        <a href="#rsvp" className={`${styles.btn} ${styles.btnGhost}`}>
          RSVP
        </a>
      </div>
    </div>
  );
}

/** Schedule float card showing day/event rows */
function ScheduleFloatCard({
  scheduleCards,
}: {
  scheduleCards?: ScheduleCard[];
}) {
  const rows = scheduleCards && scheduleCards.length > 0
    ? scheduleCards
    : [
        { day: "Sat", info: "Ceremony" },
        { day: "Sat", info: "Reception" },
      ];

  return (
    <div className={styles.floatCard}>
      <div className={styles.floatCardHead}>
        <span className={styles.floatCardLabel}>The Weekend</span>
        <span className={styles.floatCardTag}>{rows.length} events</span>
      </div>
      <div className={styles.schedRows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.schedRow}>
            <span className={styles.schedDay}>{row.day}</span>
            <span className={styles.schedInfo}>{row.info}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
