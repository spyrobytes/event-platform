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
import { showHeroCountdown } from "../../hero-card-visibility";
import { CouplePhotoFrame } from "../../../shared/CouplePhotoFrame";
import { isCutoutCouplePhotoActive } from "../../../shared/CouplePhotoFrame/frame-options";
import { cn, resolveRsvpDeadlineDisplay } from "@/lib/utils";
import styles from "./CollageMosaicHero.module.css";

export function CollageMosaicHero({
  config,
  heroAsset,
  couplePhotoAsset,
  couplePhotoFrame,
  scheduleCards,
  hasDetailsSection = false,
  eventRsvpDeadline,
  eventTimezone,
}: HeroRendererProps) {
  const { title, subtitle, coupleNames, rsvpDeadline } = config;
  const temporal = useTemporal();

  const nameLines = coupleNames
    ? coupleNames.split(/\s*&\s*/).filter(Boolean)
    : [];
  const hasNames = nameLines.length > 0;

  const hasImage = !!heroAsset?.publicUrl;
  const hasCouplePhoto = !!couplePhotoAsset?.publicUrl;

  // Resolved by the factory from the definition's couplePhotoFrameOptions;
  // the ?? is a defensive fallback to this hero's original shape.
  const frame = couplePhotoFrame ?? "circle";

  // Cutout mode: the transparent-background photo stands bottom-CENTER in
  // the scene (this hero's symmetric layout makes the couple the focal
  // point — V2/Grand Luxe anchor bottom-right), the centered portrait slot
  // is skipped, and the float cards are suppressed.
  const isCutout = isCutoutCouplePhotoActive({
    resolvedFrame: frame,
    hasCouplePhoto,
    backgroundTreatment: config.backgroundTreatment,
  });

  // This hero uses next/image fill, so the cutout wrapper needs the photo's
  // intrinsic ratio to size itself; 2:3 portrait is the fallback when the
  // asset predates dimension capture. The hero ALSO needs the ratio (and its
  // inverse) as numeric vars: the 450px width floor means cutout + text
  // can't always share 100svh, so .heroCutout grows to fit — and CSS can't
  // divide by a "W / H" ratio token to get the height back from the width.
  const cutoutW =
    couplePhotoAsset?.width && couplePhotoAsset?.height
      ? couplePhotoAsset.width
      : 2;
  const cutoutH =
    couplePhotoAsset?.width && couplePhotoAsset?.height
      ? couplePhotoAsset.height
      : 3;
  const cutoutAspect = `${cutoutW} / ${cutoutH}`;
  const cutoutHeroVars = isCutout
    ? ({
        "--cc-cutout-aspect": (cutoutW / cutoutH).toFixed(4),
        "--cc-cutout-aspect-inv": (cutoutH / cutoutW).toFixed(4),
      } as React.CSSProperties)
    : undefined;

  // Countdown data
  const countdown = (() => {
    // The factory suppresses schedule cards when a cutout is active, but the
    // countdown gate is per-hero — without this a lone countdown float card
    // would survive in flow and push the content into the cutout zone.
    if (isCutout) return null;
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

  // Belt to the factory's suspenders: schedule cards are already withheld
  // upstream when a cutout is active (createWeddingTemplate).
  const showScheduleCards = !isCutout && !!scheduleCards?.length;
  const hasFloatCards = !!countdown || showScheduleCards;

  return (
    <section
      className={cn(
        styles.hero,
        hasImage && styles.overImage,
        isCutout && styles.heroCutout,
      )}
      style={cutoutHeroVars}
      aria-label="Event hero"
      id="top"
    >
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

      {/* Cutout couple photo — transparent PNG standing bottom-center in the
          scene at z 1: above the background, below the centered content
          (z 2), so the names win the boundary overlap. The wash is a
          SIBLING, not a ::before on the frame — the shared .cutout mask and
          the host drop-shadow would both swallow a pseudo-element. No blur
          placeholder — a rectangular blur flash betrays the silhouette. */}
      {isCutout && (
        <>
          <div className={styles.cutoutWash} aria-hidden="true" />
          <CouplePhotoFrame
            frame="cutout"
            aspectRatio={cutoutAspect}
            objectPosition="center bottom"
            className={styles.photoCutout}
          >
            <EventImage
              src={couplePhotoAsset!.publicUrl!}
              alt={coupleNames || title || "Couple"}
              fill
              // Mirrors .photoCutout's width rule minus the svh term (which
              // can only shrink the render toward the 450px floor) — a loose
              // hint over-fetches 4-15x.
              sizes="(max-width: 640px) 62vw, max(450px, min(36vw, 560px))"
              priority
            />
          </CouplePhotoFrame>
        </>
      )}

      {/* Center content */}
      <div className={styles.content}>
        {/* Couple photo — uses dedicated couple photo asset; frame shape
            resolved by the factory (?? is a defensive fallback to this
            hero's original circle). Skipped in cutout mode — the photo is
            rendered as a scene layer above instead. */}
        {hasCouplePhoto && !isCutout && (
          <CouplePhotoFrame
            frame={frame}
            className={cn(
              styles.couplePhoto,
              {
                heart: styles.photoHeart,
                circle: styles.photoCircle,
                full: styles.photoFull,
                // Cutout never goes through the centered framed slot
                // (rendered as a scene layer) — entry keeps the Record total.
                cutout: undefined,
              }[frame],
            )}
          >
            <EventImage
              src={couplePhotoAsset!.publicUrl!}
              alt={coupleNames || title || ""}
              fill
              sizes="100vw"
              priority
              blurDataURL={couplePhotoAsset!.blurDataUrl}
            />
          </CouplePhotoFrame>
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
