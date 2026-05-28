"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import { cn } from "@/lib/utils";
import type { SlideshowTransition } from "@/schemas/gallery";
import type { GalleryLayoutProps } from "./types";
import styles from "./SlideshowLayout.module.css";

type Props = GalleryLayoutProps & {
  autoplay: boolean;
  /** Seconds between auto-advances. Bounded 2..15 by the schema. */
  autoplayInterval: number;
  transition: SlideshowTransition;
};

/**
 * How many slides ahead of the current we render with an actual <Image>.
 * Slides farther than this from `current` render the slide div but skip
 * the <Image> entirely — no network fetch for items the viewer can't
 * see and won't reach in the next nav. Calibrated for the most-common
 * keyboard cadence (one Next per few hundred ms) so adjacent slides
 * are always primed.
 *
 * Stacking-at-inset-0 means `loading="lazy"` is a no-op (browsers
 * consider geometric layout, not opacity, for viewport intersection),
 * so the only effective way to avoid mass eager fetches is to control
 * when the <Image> element exists in the DOM.
 */
const IMAGE_WINDOW = 2;

/**
 * How close to the end of the loaded items the slideshow should be
 * before nudging the orchestrator to fetch the next page. 3 leaves
 * room for the network round-trip to finish before the viewer hits
 * the last loaded slide — otherwise the slideshow would briefly wrap
 * back to slide 0.
 */
const PAGINATION_LOOKAHEAD = 3;

/**
 * Transition durations in milliseconds — kept in sync with the
 * cubic-bezier transitions in SlideshowLayout.module.css. Used to
 * debounce rapid prev/next clicks so we don't kick off a new
 * transition mid-flight (otherwise opacity stacks and the carousel
 * flashes).
 */
const TRANSITION_DURATIONS: Record<SlideshowTransition, number> = {
  fade: 700,
  slide: 600,
  zoom: 700,
  flip: 600,
};

const TRANSITION_CLASS: Record<SlideshowTransition, string> = {
  fade: styles.fade,
  slide: styles.slideIn,
  zoom: styles.zoom,
  flip: styles.flip,
};

/**
 * Slideshow Layout — one cinematic frame at a time.
 *
 * All loaded items are mounted absolutely-stacked under the stage; only
 * the active index has `.active` applied so its transition end state
 * (opacity 1, transform reset) kicks in. CSS handles the animation;
 * this component only manages the active index + autoplay timer.
 *
 * Autoplay defaults OFF (set by the schema). When ON, a progress bar
 * along the bottom edge eases from 0% → 100% over the interval, then
 * advances. Manual navigation (arrow click, dot click, keyboard) pauses
 * autoplay; the play/pause control lets organizers resume.
 *
 * Click anywhere on the stage to open the shared lightbox at the
 * current index — the orchestrator owns lightbox state so the deep
 * view feels continuous with the other variants.
 */
export function SlideshowLayout({
  items,
  onOpenLightbox,
  onRequestMore,
  hasMore = false,
  autoplay,
  autoplayInterval,
  transition,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Track whether the page tab is currently visible. We pause
  // autoplay when hidden so a viewer who tabs away for a minute
  // doesn't return to slide 12. Initial value is set lazily so SSR
  // sees a deterministic `true` and the first client render flips it
  // only if the tab actually started hidden.
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });
  // Debounce: ignore navigation calls while a transition is still
  // rendering. Stored in a ref so the lock survives across closures.
  const isTransitioningRef = useRef(false);
  const progressRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAutoPlaying =
    autoplay && !isPaused && isVisible && items.length > 1;
  const transitionDuration = TRANSITION_DURATIONS[transition];

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setCurrent(index);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, transitionDuration);
    },
    [transitionDuration],
  );

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    goTo((current - 1 + items.length) % items.length);
  }, [current, items.length, goTo]);

  // Manual navigation pauses autoplay so the user isn't fighting the
  // timer. Organizers can resume via the play/pause control next to
  // the dots.
  const manualNext = useCallback(() => {
    setIsPaused(true);
    goNext();
  }, [goNext]);

  const manualPrev = useCallback(() => {
    setIsPaused(true);
    goPrev();
  }, [goPrev]);

  const manualGoTo = useCallback(
    (index: number) => {
      setIsPaused(true);
      goTo(index);
    },
    [goTo],
  );

  // Autoplay timer. Re-armed on every `current` change so the next tick
  // schedules from the moment the new slide lands. Cleared on
  // unmount/pause via the cleanup.
  useEffect(() => {
    if (!isAutoPlaying) return;
    timerRef.current = setTimeout(
      goNext,
      autoplayInterval * 1000,
    );
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAutoPlaying, autoplayInterval, current, goNext]);

  // Progress bar — re-anchored on every advance. Forced reflow between
  // the width=0 reset and the width=100% transition ensures the bar
  // restarts visually (without it the browser may collapse the two
  // style writes and skip the animation).
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    if (!isAutoPlaying) {
      el.style.transition = "none";
      el.style.width = "0%";
      return;
    }
    el.style.transition = "none";
    el.style.width = "0%";
    void el.offsetWidth;
    el.style.transition = `width ${autoplayInterval}s linear`;
    el.style.width = "100%";
  }, [current, isAutoPlaying, autoplayInterval]);

  // Pause autoplay when the tab is hidden so the slideshow doesn't
  // silently advance in the background. Browser throttles setTimeout
  // in background tabs but doesn't stop it; without this, a viewer
  // who tabs away for a minute comes back to a slide deep into the
  // gallery instead of where they left off.
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Pagination prefetch — when the viewer nears the end of the loaded
  // items array and the orchestrator has reported `hasMore`, nudge it
  // to load the next page. Without this, the slideshow wraps back to
  // index 0 at items.length silently (the viewer never sees photos
  // beyond the first page since they don't scroll). The orchestrator
  // dedupes concurrent calls via its own `loadingMore` flag.
  useEffect(() => {
    if (!onRequestMore || !hasMore) return;
    if (current >= items.length - PAGINATION_LOOKAHEAD) {
      onRequestMore();
    }
  }, [current, hasMore, items.length, onRequestMore]);

  // Keyboard navigation while the stage has focus (or just at the page
  // level, since this is the only stage). ArrowLeft/Right behave like
  // the manual arrows; Space toggles play/pause when autoplay is on.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore when the user is typing in a form (e.g. organizer editor).
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        manualNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        manualPrev();
      } else if (e.key === " " && autoplay && items.length > 1) {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [autoplay, items.length, manualNext, manualPrev]);

  if (items.length === 0) return null;

  const transitionClass = TRANSITION_CLASS[transition];
  const currentItem = items[current];
  const captionText = currentItem.caption;

  return (
    <div
      role="region"
      aria-label="Album slideshow"
      aria-roledescription="carousel"
    >
      <div
        className={styles.stage}
        onClick={() => onOpenLightbox(current)}
        role="button"
        tabIndex={0}
        aria-label={`Open photo ${current + 1} of ${items.length}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOpenLightbox(current);
          }
        }}
      >
        {items.map((item, i) => {
          // Circular distance from `current` — wraps around the gallery
          // so the slide adjacent across the boundary (e.g. last when
          // current=0) is still considered "near".
          const direct = Math.abs(i - current);
          const distance = Math.min(direct, items.length - direct);
          const inWindow = distance <= IMAGE_WINDOW;
          return (
            <div
              key={item.id}
              className={cn(
                styles.slide,
                transitionClass,
                i === current && styles.active,
              )}
              aria-hidden={i !== current}
            >
              {/* Stacking at inset:0 means `loading="lazy"` is a no-op
                  (every slide is geometrically in the viewport even at
                  opacity:0), so the only way to defer the eager fetch
                  for distant items is to NOT render the <Image> at all
                  until they enter the IMAGE_WINDOW around current.
                  Adjacent slides (±IMAGE_WINDOW) stay mounted so
                  prev/next transitions still cross-fade smoothly; jumps
                  via dot to a far slide will load on demand. */}
              {inWindow && (
                <Image
                  src={item.thumbnailSrc}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1200px) 80vw, 1140px"
                  // Only the very first slide gets priority (preload
                  // link in head). The window keeps the rest fast
                  // without polluting <head> with N preload tags as
                  // the viewer navigates.
                  priority={i === 0}
                  placeholder={item.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={item.blurDataUrl ?? undefined}
                  unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
                />
              )}
            </div>
          );
        })}

        {captionText && (
          <div className={styles.caption}>{captionText}</div>
        )}

        <div className={styles.counter} aria-live="polite">
          {current + 1} / {items.length}
        </div>

        {/* Stop-propagation wrappers around nav arrows so a click on the
            arrow doesn't ALSO open the lightbox (the stage's onClick
            bubbles otherwise). */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              className={cn(styles.nav, styles.navPrev)}
              onClick={(e) => {
                e.stopPropagation();
                manualPrev();
              }}
              aria-label="Previous photo"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                width={20}
                height={20}
                aria-hidden
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={cn(styles.nav, styles.navNext)}
              onClick={(e) => {
                e.stopPropagation();
                manualNext();
              }}
              aria-label="Next photo"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                width={20}
                height={20}
                aria-hidden
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Autoplay progress bar — only when autoplay is engaged.
            Hidden under reduced-motion via the stylesheet. */}
        {isAutoPlaying && (
          <div className={styles.progress} aria-hidden>
            <span ref={progressRef} className={styles.progressFill} />
          </div>
        )}
      </div>

      {items.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Album photos">
          {autoplay && (
            <button
              type="button"
              className={styles.playPause}
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
              aria-pressed={isPaused}
            >
              {isPaused ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width={12} height={12} aria-hidden>
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width={12} height={12} aria-hidden>
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              )}
            </button>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Photo ${i + 1}`}
              className={cn(styles.dot, i === current && styles.dotActive)}
              onClick={() => manualGoTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
