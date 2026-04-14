"use client";

/**
 * Collage Mosaic Hero — The Celebration House
 *
 * A mosaic grid of photos behind the hero text, creating a
 * vibrant, social, communal feel. Couple photo displayed as
 * a centered circular portrait. Names and date prominently centered.
 *
 * Features two glass float-cards:
 * - Countdown card (days/hours/minutes + RSVP deadline)
 * - Event dates card (schedule summary)
 */

import { EventImage } from "@/components/media/EventImage";
import type { HeroRendererProps } from "../../types";
import { useTemporal } from "../../../shared";
import styles from "./CollageMosaicHero.module.css";

export function CollageMosaicHero({
  config,
  heroAsset,
  couplePhotoAsset,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, rsvpDeadline } = config;
  const temporal = useTemporal();

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];
  const hasNames = nameLines.length > 0;

  const hasImage = !!heroAsset?.publicUrl;
  const hasCouplePhoto = !!couplePhotoAsset?.publicUrl;

  // Countdown data
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

  // Compute RSVP deadline state
  const deadlineState = (() => {
    if (!resolvedRsvpDeadline) return null;
    const deadlineDate = eventRsvpDeadline ? new Date(eventRsvpDeadline) : null;
    if (!deadlineDate || isNaN(deadlineDate.getTime())) {
      return { status: "upcoming" as const, text: `RSVP by ${resolvedRsvpDeadline}` };
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
      return { status: "urgent" as const, text: `RSVP closes in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}` };
    }
    return { status: "upcoming" as const, text: `RSVP by ${resolvedRsvpDeadline}` };
  })();

  const showScheduleCards = scheduleCards && scheduleCards.length > 0;
  const hasFloatCards = !!countdown || showScheduleCards;

  return (
    <section className={`${styles.hero} ${hasImage ? styles.overImage : ""}`} aria-label="Event hero" id="top">
      {/* Background image */}
      {hasImage ? (
        <div className={styles.bgImage} aria-hidden="true">
          <EventImage
            src={heroAsset!.publicUrl!}
            alt=""
            fill
            sizes="100vw"
            priority
            blurDataURL={heroAsset!.blurDataUrl}
          />
        </div>
      ) : (
        <div className={styles.bgFallback} aria-hidden="true" />
      )}

      {/* Center content */}
      <div className={styles.content}>
        {/* Couple photo — uses dedicated couple photo asset */}
        {hasCouplePhoto && (
          <div className={styles.couplePhoto}>
            <EventImage
              src={couplePhotoAsset!.publicUrl!}
              alt={coupleNames || title || ""}
              fill
              sizes="100vw"
              priority
              blurDataURL={couplePhotoAsset!.blurDataUrl}
            />
          </div>
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

        {subtitle && <p className={styles.dateText}>{subtitle}</p>}

        {hasDetailsSection && (
          <div className={styles.cta}>
            <a href="#details" className={styles.ctaBtn}>View Details</a>
          </div>
        )}
      </div>

      {/* Float cards: countdown + event dates */}
      {hasFloatCards && (
        <div className={styles.floatCards}>
          {/* Countdown card */}
          {countdown && (
            <div className={styles.floatCard}>
              <div className={styles.floatCardHead}>
                <span className={styles.floatCardLabel}>Countdown</span>
              </div>
              <div className={styles.countdown}>
                <div className={styles.countUnit}>
                  <div className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.days)}
                  </div>
                  <div className={styles.countLabel}>days</div>
                </div>
                <div className={styles.countSep}>:</div>
                <div className={styles.countUnit}>
                  <div className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.hours).padStart(2, "0")}
                  </div>
                  <div className={styles.countLabel}>hours</div>
                </div>
                <div className={styles.countSep}>:</div>
                <div className={styles.countUnit}>
                  <div className={styles.countNum} suppressHydrationWarning>
                    {String(countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className={styles.countLabel}>min</div>
                </div>
              </div>
              {deadlineState && (
                <div className={styles.floatCardFoot}>
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
          )}

          {/* Event dates card */}
          {showScheduleCards && (
            <div className={styles.floatCard}>
              <div className={styles.floatCardHead}>
                <span className={styles.floatCardLabel}>Events</span>
              </div>
              <div className={styles.eventList}>
                {scheduleCards!.slice(0, 4).map((card, i) => (
                  <div key={i} className={styles.eventRow}>
                    <span className={styles.eventDay}>{card.day}</span>
                    <span className={styles.eventDot} aria-hidden="true" />
                    <span className={styles.eventInfo}>{card.info}</span>
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
