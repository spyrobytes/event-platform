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
import {
  isFloatingCouplePhotoActive,
  isCutoutCouplePhotoActive,
  resolveCutoutAspect,
} from "../../../shared/CouplePhotoFrame/frame-options";
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

  // Portrait background treatment — the hero image IS the subject (couple
  // photo as background): lighter grade, drift off, top-anchored crop (heads
  // never clip), and the floating couple portrait is skipped to keep the
  // hero clean.
  const isPortraitBackdrop = config.backgroundTreatment === "portrait";

  // Horizontal focal point for the cover-crop — only bites on phones (the
  // landscape image overflows horizontally there), a no-op on desktop. Keeps a
  // one-sided motif in frame; CSS owns the per-side object-position and the
  // luxeDrift-off, with the Y axis left to the treatment class.
  // "edges" keeps BOTH sides: a second right-anchored copy is masked against
  // the left-anchored primary (see the module's edges block). Portrait wins
  // over a stale "edges" (its subject sits in the blend zone): normalize to
  // center at render so the wrapper never carries data-focal="edges" under
  // portrait and no second copy is mounted.
  const rawFocalX = config.backgroundFocalX ?? "center";
  const focalX =
    isPortraitBackdrop && rawFocalX === "edges" ? "center" : rawFocalX;
  const isEdges = focalX === "edges";

  // Resolved by the factory from the definition's couplePhotoFrameOptions;
  // the ?? is a defensive fallback to this hero's original shape.
  const frame = couplePhotoFrame ?? "heart";

  // Cutout mode: the transparent-background photo is layered raw in the
  // scene (bottom-right, no gold hardware) instead of framed top-left, and
  // the info cards are suppressed to keep the composition clean.
  const isCutout = isCutoutCouplePhotoActive({
    resolvedFrame: frame,
    hasCouplePhoto: !!couplePhotoAsset?.publicUrl,
    backgroundTreatment: config.backgroundTreatment,
  });

  // This hero uses next/image fill, so the cutout wrapper needs the photo's
  // intrinsic ratio to size itself (shared resolver, 2:3 portrait fallback
  // when the asset predates dimension capture).
  const { aspectString: cutoutAspect } = resolveCutoutAspect(couplePhotoAsset);

  const showCountdown = !!countdown;
  const showSchedule = !!(scheduleCards && scheduleCards.length > 0);
  const showCards = (showCountdown || showSchedule) && !isCutout;

  const frameClass = {
    heart: styles.photoHeart,
    circle: styles.photoCircle,
    full: styles.photoFull,
    // Cutout never goes through the framed top-left slot (rendered as a
    // scene layer instead) — entry exists to keep the Record total.
    cutout: undefined,
  }[frame];

  return (
    <section className={styles.hero} aria-label="Event hero" id="top">
      {heroAsset?.publicUrl ? (
        <div
          className={cn(styles.bgImage, isPortraitBackdrop && styles.bgPortrait)}
          data-focal={focalX}
        >
          <EventImage
            className={styles.imgPrimary}
            src={heroAsset.publicUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            blurDataURL={heroAsset.blurDataUrl}
            renditionWidths={heroAsset.renditionWidths}
          />
          {/* "Both sides": right-anchored second copy, masked against the
              primary on phones (desktop hides it in CSS). Identical
              responsive-image inputs — same rendition, cache hit, no second
              transfer. Eager but NOT priority: only the primary preloads. */}
          {isEdges && (
            <EventImage
              className={styles.imgEdgeRight}
              src={heroAsset.publicUrl}
              alt=""
              aria-hidden="true"
              fill
              sizes="100vw"
              loading="eager"
              blurDataURL={heroAsset.blurDataUrl}
              renditionWidths={heroAsset.renditionWidths}
            />
          )}
        </div>
      ) : (
        <div className={styles.bgFallback} aria-hidden="true" />
      )}

      {/* Cutout couple photo — transparent PNG layered raw in the scene,
          bottom-right at z 1: above the background, below the centered
          content (z 2) and info row (z 3), so the names win any overlap.
          No vignette/grading children — the cutout keeps its crispness;
          no blur placeholder — a rectangular blur flash betrays the
          transparent silhouette. */}
      {isCutout && (
        <CouplePhotoFrame
          frame="cutout"
          aspectRatio={cutoutAspect}
          objectPosition="center bottom"
          className={styles.photoCutout}
        >
          <EventImage
            src={couplePhotoAsset!.publicUrl!}
            alt={coupleNames || "Couple"}
            fill
            // Mirrors .photoCutout's width clamps exactly — a loose hint here
            // makes next/image fetch the 640-750px srcset slot for a
            // ~360px-rendered image (review-measured 4-15x pixel over-fetch).
            sizes="(max-width: 640px) 42vw, (max-width: 1500px) 30vw, 450px"
            priority
            renditionWidths={couplePhotoAsset!.renditionWidths}
          />
        </CouplePhotoFrame>
      )}

      {/* Couple portrait — top left, organizer-selected frame shape.
          Skipped in portrait mode: the background already IS the couple. */}
      {couplePhotoAsset?.publicUrl &&
        isFloatingCouplePhotoActive(config.backgroundTreatment) &&
        !isCutout && (
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
            renditionWidths={couplePhotoAsset.renditionWidths}
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
