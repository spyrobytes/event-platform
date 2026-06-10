"use client";

import type { HeroConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { useTemporal } from "../../shared";
import { CouplePhotoFrame } from "../../shared/CouplePhotoFrame";
import { resolveCouplePhotoFrame } from "../../shared/CouplePhotoFrame/frame-options";
import { WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS } from "../couple-photo-frame-options";
import { cn, resolveRsvpDeadlineDisplay } from "@/lib/utils";
import styles from "./CinematicHero.module.css";

type ScheduleCard = { day: string; info: string };

type CinematicHeroProps = {
  config: HeroConfig;
  heroAsset?: MediaAsset | null;
  couplePhotoAsset?: MediaAsset | null;
  scheduleCards?: ScheduleCard[];
  hasDetailsSection?: boolean;
  /** Event-level RSVP deadline (ISO string) — used when hero config has no manual override */
  eventRsvpDeadline?: string;
  /** IANA timezone for formatting dates in event-local time. Required;
   *  caller defaults to "UTC" upstream. */
  eventTimezone: string;
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
  couplePhotoAsset,
  scheduleCards: scheduleCardsProp,
  hasDetailsSection = false,
  eventRsvpDeadline,
  eventTimezone,
}: CinematicHeroProps) {
  const {
    title,
    subtitle,
    style: heroStyle = "standard",
    showCountdown = false,
    showScheduleCards = false,
    coupleNames,
    rsvpDeadline,
  } = config;

  const temporal = useTemporal();

  const isCinematic = heroStyle === "cinematic";

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

  const resolvedRsvpDeadline = resolveRsvpDeadlineDisplay(
    rsvpDeadline,
    eventRsvpDeadline,
    eventTimezone
  );

  // Date text for eyebrow — use subtitle as date text
  const dateText = subtitle || "";

  const hasCouplePhoto = isCinematic && !!couplePhotoAsset?.publicUrl;

  // Portrait background treatment — the hero image IS the subject (couple
  // photo as background): top-anchored crop (heads never clip), Ken Burns off.
  const isPortraitBackdrop = config.backgroundTreatment === "portrait";

  // Organizer-selected frame shape; unset/unknown resolves to the first
  // curated option (circle — V2's original look).
  const frame =
    resolveCouplePhotoFrame(
      WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS,
      config.couplePhotoFrame,
    ) ?? "circle";
  const frameClass = {
    heart: styles.photoHeart,
    circle: styles.photoCircle,
    full: styles.photoFull,
  }[frame];

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {/* Background image with gradient overlay */}
      {heroAsset?.publicUrl ? (
        <div
          className={cn(styles.heroMedia, isPortraitBackdrop && styles.heroMediaPortrait)}
          aria-hidden="true"
        >
          <img
            src={heroAsset.publicUrl}
            alt=""
            loading="eager"
          />
        </div>
      ) : (
        <div className={styles.heroFallback} aria-hidden="true" />
      )}

      {/* Parallax mountain layers */}
      <div className={styles.parallaxLayer} style={{ zIndex: 1, opacity: 0.06, color: "var(--sage-d, #5c6b55)" }} aria-hidden="true">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none"><path d="M0 200 L0 120 L120 80 L240 110 L360 50 L480 90 L600 30 L720 70 L840 20 L960 60 L1080 40 L1200 80 L1320 55 L1440 100 L1440 200Z" fill="currentColor"/></svg>
      </div>
      <div className={styles.parallaxLayer} style={{ zIndex: 2, opacity: 0.045, color: "var(--forest, #3f4f3a)" }} aria-hidden="true">
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none"><path d="M0 160 L0 100 L100 70 L200 95 L340 45 L440 80 L560 25 L680 65 L800 15 L920 55 L1040 35 L1160 70 L1280 50 L1440 90 L1440 160Z" fill="currentColor"/></svg>
      </div>
      <div className={styles.parallaxLayer} style={{ zIndex: 3, opacity: 0.035, color: "var(--night, #1e1b17)" }} aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 120 L0 80 L80 60 L180 78 L300 40 L420 65 L520 30 L640 55 L760 20 L880 48 L1000 28 L1120 52 L1240 38 L1360 60 L1440 75 L1440 120Z" fill="currentColor"/></svg>
      </div>

      {/* Content — bottom-aligned via parent flex-end */}
      <div
        className={styles.heroContent}
        style={{ width: `min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))`, margin: "0 auto" }}
      >
        <div className={hasCouplePhoto ? styles.heroTextWithPhoto : styles.heroText}>
          {/* Couple photo — portrait beside the names */}
          {hasCouplePhoto && (
            <CouplePhotoFrame
              frame={frame}
              className={cn(styles.couplePhoto, frameClass)}
            >
              <img
                src={couplePhotoAsset!.publicUrl!}
                alt={coupleNames || ""}
                loading="eager"
              />
            </CouplePhotoFrame>
          )}

          <div className={hasCouplePhoto ? styles.heroTextBlock : undefined}>
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

            {/* CTA button — links to event details (only if details section exists) */}
            {isCinematic && hasDetailsSection && (
              <div className={styles.cta}>
                <a href="#details" className={`${styles.btn} ${styles.btnPrimary}`}>
                  View Details
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Float cards: countdown + schedule */}
        {isCinematic && (countdown || showScheduleCards) && (
          <div className={styles.heroCards}>
            {/* Countdown card */}
            {countdown && (
              <CountdownCard
                countdown={countdown}
                rsvpDeadline={resolvedRsvpDeadline}
                rsvpDeadlineIso={eventRsvpDeadline ?? rsvpDeadline}
              />
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
 * Uses key-based re-mounting to trigger CSS flip animation on value change.
 *
 * RSVP deadline footer states:
 * - No deadline set → no footer
 * - Deadline upcoming → "RSVP by [date]"
 * - Deadline ≤ 3 days away → urgent "RSVP closes in X days"
 * - Deadline passed → "RSVP closed"
 */
function CountdownCard({
  countdown,
  rsvpDeadline,
  rsvpDeadlineIso,
}: {
  countdown: { days: number; hours: number; minutes: number };
  /** Formatted display string, e.g. "March 15, 2026" */
  rsvpDeadline?: string;
  /** Raw ISO string or date-like string for computing deadline state */
  rsvpDeadlineIso?: string;
}) {
  const dStr = String(countdown.days);
  const hStr = String(countdown.hours).padStart(2, "0");
  const mStr = String(countdown.minutes).padStart(2, "0");

  // Compute RSVP deadline state
  const deadlineState = (() => {
    if (!rsvpDeadline) return null;

    const deadlineDate = rsvpDeadlineIso ? new Date(rsvpDeadlineIso) : null;
    if (!deadlineDate || isNaN(deadlineDate.getTime())) {
      return { status: "upcoming" as const, text: `RSVP by ${rsvpDeadline}` };
    }

    const now = new Date();
    const msRemaining = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: "closed" as const, text: "RSVP closed" };
    }
    if (daysRemaining === 0) {
      return { status: "urgent" as const, text: "RSVP closes today" };
    }
    if (daysRemaining <= 3) {
      return {
        status: "urgent" as const,
        text: `RSVP closes in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
      };
    }
    return { status: "upcoming" as const, text: `RSVP by ${rsvpDeadline}` };
  })();

  return (
    <div className={styles.floatCard}>
      <div className={styles.floatCardHead}>
        <span className={styles.floatCardLabel}>Countdown</span>
      </div>
      <div className={styles.countdown}>
        <div className={styles.countUnit}>
          <div key={dStr} className={styles.countNum} suppressHydrationWarning>
            {dStr}
          </div>
          <div className={styles.countLabel}>days</div>
        </div>
        <div className={styles.countUnit}>
          <div key={hStr} className={styles.countNum} suppressHydrationWarning>
            {hStr}
          </div>
          <div className={styles.countLabel}>hours</div>
        </div>
        <div className={styles.countUnit}>
          <div key={mStr} className={styles.countNum} suppressHydrationWarning>
            {mStr}
          </div>
          <div className={styles.countLabel}>min</div>
        </div>
      </div>
      {deadlineState && (
        <div className={styles.floatCardFooter}>
          <span
            className={
              deadlineState.status === "urgent"
                ? styles.deadlineUrgent
                : deadlineState.status === "closed"
                  ? styles.deadlineClosed
                  : styles.deadlineText
            }
            suppressHydrationWarning
          >
            {deadlineState.text}
          </span>
        </div>
      )}
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
    : [];

  if (rows.length === 0) return null;

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
