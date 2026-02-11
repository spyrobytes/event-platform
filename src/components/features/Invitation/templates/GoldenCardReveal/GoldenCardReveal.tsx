"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getGoldenCardThemeTokens } from "@/lib/invitation-themes";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { GoldenCardRevealProps, ConfettiShape, CardState } from "./types";
import styles from "./GoldenCardReveal.module.css";

/**
 * Corner flourish SVG path for decorative corners
 */
const FLOURISH_PATH = "M5 45 Q5 5 45 5 Q25 5 25 25 Q25 25 5 25 Q5 45 5 45Z";

/**
 * Confetti configuration
 */
const CONFETTI_CONFIG = {
  particleCount: 60,
  shapes: ["circle", "square", "star"] as ConfettiShape[],
  colors: [
    "var(--gcr-confetti-1)",
    "var(--gcr-confetti-2)",
    "var(--gcr-confetti-3)",
    "var(--gcr-confetti-4)",
    "var(--gcr-confetti-5)",
  ],
};

/**
 * Tilt effect configuration
 */
const TILT_CONFIG = {
  maxTilt: 12, // degrees
  glareOpacity: 0.6,
};

/**
 * Extract monogram from invitation data
 */
function getMonogram(data: GoldenCardRevealProps["data"]): string {
  // Use explicit monogram if provided
  if (data.monogram) return data.monogram;

  // Try to extract from person names
  const p1 = data.person1Name;
  const p2 = data.person2Name;

  if (p1 && p2) {
    return `${p1[0]}${p2[0]}`;
  }

  // Fall back to extracting from coupleNames
  const parts = data.coupleNames.split(/[&,]/);
  if (parts.length >= 2) {
    const first = parts[0].trim()[0] || "";
    const second = parts[1].trim()[0] || "";
    return `${first}${second}`;
  }

  return data.coupleNames.substring(0, 2).toUpperCase();
}

/**
 * Extract couple names as partner1 and partner2
 */
function getCoupleNames(data: GoldenCardRevealProps["data"]): {
  partner1: string;
  partner2: string;
} {
  // Use explicit names if provided
  if (data.person1Name && data.person2Name) {
    return { partner1: data.person1Name, partner2: data.person2Name };
  }

  // Parse from coupleNames string
  const parts = data.coupleNames.split(/[&,]/);
  if (parts.length >= 2) {
    return {
      partner1: parts[0].trim(),
      partner2: parts[1].trim(),
    };
  }

  return { partner1: data.coupleNames, partner2: "" };
}

/**
 * Format event date for display
 */
function formatEventDate(date: Date, locale: string = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * GoldenCardReveal — Premium wedding invitation with 3D flip animation
 *
 * Features:
 * - Center-axis card flip with wax seal break
 * - Cursor-following tilt and glare effects
 * - Confetti burst on reveal
 * - Theme-aware styling via CSS variables
 * - Keyboard accessible with reduced motion support
 */
export function GoldenCardReveal({
  data,
  initialState,
  onStateChange,
  showReplay = true,
  showHint = true,
  disableConfetti = false,
  disableTilt = false,
  className,
}: GoldenCardRevealProps) {
  // Refs
  const stageRef = useRef<HTMLDivElement>(null);
  // [Fix #1] Changed from HTMLButtonElement to HTMLDivElement —
  // card is now a <div role="button"> so nested <Link> is valid HTML
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  // [Fix #4] Track all pending timers so we can cancel on unmount
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // State
  const [cardState, setCardState] = useState<CardState>({
    isFlipped: initialState === "open",
    isAnimating: false,
    isBreaking: initialState === "open",
  });

  // Reduced motion preference (uses useSyncExternalStore for lint-safe implementation)
  const prefersReducedMotion = useReducedMotion();

  // [Fix #5] Detect touch device after mount to avoid SSR/client hydration mismatch.
  // During SSR and initial client render this is false; useEffect updates it client-side.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
  }, []);

  // Should enable tilt effect
  const shouldTilt = !disableTilt && !prefersReducedMotion && !isTouchDevice;

  // [Fix #4] Clean up pending timers on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  /**
   * Schedule a timeout and track it for cleanup.
   * Returns the timer id.
   */
  const safeTimeout = useCallback(
    (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        // Remove from tracking after it fires
        timersRef.current = timersRef.current.filter((t) => t !== id);
        fn();
      }, delay);
      timersRef.current.push(id);
      return id;
    },
    []
  );

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      if (cardState.isAnimating) {
        onStateChange(cardState.isFlipped ? "opening" : "closing");
      } else {
        onStateChange(cardState.isFlipped ? "open" : "idle");
      }
    }
  }, [cardState.isFlipped, cardState.isAnimating, onStateChange]);

  // Extract data
  const coupleNames = useMemo(() => getCoupleNames(data), [data]);
  const monogram = useMemo(() => getMonogram(data), [data]);
  const headerText = data.headerText || "Together with their families";

  // [Fix #7] Defensively coerce eventDate — it may arrive as a string from JSON
  const formattedDate = useMemo(() => {
    const date =
      data.eventDate instanceof Date
        ? data.eventDate
        : new Date(data.eventDate);
    return formatEventDate(date, "en-US");
  }, [data.eventDate]);

  /**
   * Create confetti burst animation
   */
  const createConfettiBurst = useCallback(() => {
    if (
      disableConfetti ||
      prefersReducedMotion ||
      !confettiRef.current ||
      !cardRef.current
    ) {
      return;
    }

    const container = confettiRef.current;
    const cardRect = cardRef.current.getBoundingClientRect();
    const originX = cardRect.left + cardRect.width / 2;
    const originY = cardRect.top + cardRect.height * 0.4;

    const { particleCount, shapes, colors } = CONFETTI_CONFIG;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      particle.className = cn(
        styles.confetti,
        shape === "circle" && styles.confettiCircle,
        shape === "square" && styles.confettiSquare,
        shape === "star" && styles.confettiStar
      );

      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 6;
      const angle = (Math.random() * 140 + 200) * (Math.PI / 180);
      const velocity = Math.random() * 400 + 300;
      const spin = Math.random() * 720 - 360;
      const delay = Math.random() * 100;

      particle.style.cssText = `
        left: ${originX}px;
        top: ${originY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
      `;

      container.appendChild(particle);

      const duration = Math.random() * 1500 + 2000;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity;

      safeTimeout(() => {
        particle.animate(
          [
            {
              transform: "translate(0, 0) rotate(0deg) scale(1)",
              opacity: 1,
            },
            {
              transform: `translate(${dx * 0.3}px, ${dy * 0.3}px) rotate(${spin * 0.3}deg) scale(1.1)`,
              opacity: 1,
              offset: 0.3,
            },
            {
              transform: `translate(${dx}px, ${dy + 400}px) rotate(${spin}deg) scale(0.5)`,
              opacity: 0,
            },
          ],
          {
            duration,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fill: "forwards",
          }
        );

        safeTimeout(() => particle.remove(), duration);
      }, delay);
    }
  }, [disableConfetti, prefersReducedMotion, safeTimeout]);

  /**
   * Handle card flip (open/close toggle)
   */
  const handleCardClick = useCallback(() => {
    if (cardState.isAnimating) return;

    const stage = stageRef.current;
    if (stage) {
      // Reset tilt for clean animation
      stage.style.setProperty("--tilt-x", "0deg");
      stage.style.setProperty("--tilt-y", "0deg");
      stage.style.setProperty("--glare-opacity", "0");
    }

    if (!cardState.isFlipped) {
      // === OPENING ===

      // [Fix #10] If user prefers reduced motion, skip staged
      // timeouts and flip immediately without seal break animation
      if (prefersReducedMotion) {
        setCardState({ isFlipped: true, isAnimating: false, isBreaking: false });
        return;
      }

      setCardState({ isFlipped: false, isAnimating: true, isBreaking: true });

      // Trigger confetti after seal breaks
      safeTimeout(() => {
        createConfettiBurst();
      }, 300);

      // Flip the card
      safeTimeout(() => {
        setCardState({ isFlipped: true, isAnimating: true, isBreaking: true });
      }, 200);

      // Animation complete
      safeTimeout(() => {
        setCardState({ isFlipped: true, isAnimating: false, isBreaking: true });
      }, 1600);
    } else {
      // === CLOSING ===

      // [Fix #10] Immediate close for reduced motion
      if (prefersReducedMotion) {
        setCardState({
          isFlipped: false,
          isAnimating: false,
          isBreaking: false,
        });
        return;
      }

      setCardState({ isFlipped: false, isAnimating: true, isBreaking: true });

      // Reset seal break after flip completes
      safeTimeout(() => {
        setCardState({
          isFlipped: false,
          isAnimating: false,
          isBreaking: false,
        });
      }, 1400);
    }
  }, [
    cardState.isFlipped,
    cardState.isAnimating,
    prefersReducedMotion,
    createConfettiBurst,
    safeTimeout,
  ]);

  /**
   * Handle replay button click
   */
  const handleReplay = useCallback(() => {
    if (cardState.isAnimating) return;

    // [Fix #10] Immediate reset for reduced motion
    if (prefersReducedMotion) {
      setCardState({ isFlipped: false, isAnimating: false, isBreaking: false });
      return;
    }

    // Close the card first
    setCardState({ isFlipped: false, isAnimating: true, isBreaking: true });

    // Reset seal break after flip completes
    safeTimeout(() => {
      setCardState({ isFlipped: false, isAnimating: false, isBreaking: false });
    }, 1400);
  }, [cardState.isAnimating, prefersReducedMotion, safeTimeout]);

  /**
   * Handle keyboard navigation
   * [Fix #1] Updated type from HTMLButtonElement to HTMLDivElement
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick]
  );

  /**
   * Handle mouse move for tilt effect
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // [Fix #9] Disable tilt when card is flipped — it makes
      // the invitation text hard to read and RSVP button a moving target
      if (!shouldTilt || cardState.isAnimating || cardState.isFlipped) return;

      const stage = stageRef.current;
      const card = cardRef.current;
      if (!stage || !card) return;

      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const percentX = mouseX / (rect.width / 2);
      const percentY = mouseY / (rect.height / 2);

      const tiltX = -percentY * TILT_CONFIG.maxTilt;
      const tiltY = percentX * TILT_CONFIG.maxTilt;

      stage.style.setProperty("--tilt-x", `${tiltX}deg`);
      stage.style.setProperty("--tilt-y", `${tiltY}deg`);

      // Glare position
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;

      stage.style.setProperty("--glare-x", `${glareX}%`);
      stage.style.setProperty("--glare-y", `${glareY}%`);
      stage.style.setProperty(
        "--glare-opacity",
        String(TILT_CONFIG.glareOpacity)
      );

      // Dynamic seal shadow (only when not flipped)
      if (!cardState.isFlipped) {
        const seal = card.querySelector(`.${styles.seal}`) as HTMLElement;
        if (seal) {
          const shadowX = percentX * 4;
          const shadowY = percentY * 4 + 2;
          seal.style.setProperty("--shadow-x", `${shadowX}px`);
          seal.style.setProperty("--shadow-y", `${shadowY}px`);
        }
      }
    },
    [shouldTilt, cardState.isAnimating, cardState.isFlipped]
  );

  /**
   * Handle mouse leave - reset tilt
   */
  const handleMouseLeave = useCallback(() => {
    if (!shouldTilt) return;

    const stage = stageRef.current;
    if (!stage) return;

    stage.style.setProperty("--tilt-x", "0deg");
    stage.style.setProperty("--tilt-y", "0deg");
    stage.style.setProperty("--glare-opacity", "0");
  }, [shouldTilt]);

  // Get theme tokens (use ivory as default, themes are applied via InvitationShell)
  // The component reads from CSS variables set by InvitationShell
  const themeTokens = useMemo(() => getGoldenCardThemeTokens("ivory"), []);

  // [Fix #6] Renamed from `styles` to `tokenVars` to avoid
  // shadowing the CSS Module import
  const stageStyle = useMemo(() => {
    const tokenVars: Record<string, string> = {};
    Object.entries(themeTokens).forEach(([key, value]) => {
      tokenVars[key] = value;
    });
    return tokenVars as React.CSSProperties;
  }, [themeTokens]);

  // Card state classes
  const cardClasses = cn(
    styles.card,
    cardState.isFlipped && styles.flipped,
    cardState.isBreaking && styles.breaking
  );

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center p-4",
        className
      )}
      /* Theme tokens live on the outer wrapper so that BOTH the
         confetti container (sibling) and the stage inherit them.
         Previously tokens were on .stage only — moving confetti
         outside the stage meant it lost access to --gcr-confetti-* vars. */
      style={stageStyle}
    >
      {/* [Fix #2] Confetti container moved OUTSIDE the stage so that
          position: fixed works correctly. The stage's preserve-3d
          would otherwise create a containing block and trap it. */}
      <div
        ref={confettiRef}
        className={styles.confettiContainer}
        aria-hidden="true"
      />

      <div
        ref={stageRef}
        className={cn(styles.root, styles.stage)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Replay button */}
        {showReplay && cardState.isFlipped && !cardState.isAnimating && (
          <button
            type="button"
            className={styles.replayButton}
            onClick={handleReplay}
            aria-label="Replay animation"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Replay
          </button>
        )}

        {/* [Fix #1] Changed from <button> to <div role="button"> so that
            the nested <Link> (RSVP button) is valid HTML. Interactive content
            cannot be nested inside <button> per the HTML spec. */}
        <div
          ref={cardRef}
          role="button"
          tabIndex={0}
          className={cardClasses}
          onClick={handleCardClick}
          onKeyDown={handleKeyDown}
          aria-label={
            cardState.isFlipped
              ? `Wedding invitation for ${coupleNames.partner1} and ${coupleNames.partner2}. Tap to close.`
              : "Sealed wedding invitation. Tap to open."
          }
          aria-expanded={cardState.isFlipped}
        >
          <span className={styles.cardWrapper}>
            <span className={styles.cardContent}>
              {/* BACK FACE (Sealed) */}
              <span className={cn(styles.cardFace, styles.cardBack)}>
                {/* Corner flourishes */}
                <span className={cn(styles.cornerFlourish, styles.topLeft)}>
                  <svg viewBox="0 0 50 50">
                    <path d={FLOURISH_PATH} />
                  </svg>
                </span>
                <span className={cn(styles.cornerFlourish, styles.topRight)}>
                  <svg viewBox="0 0 50 50">
                    <path d={FLOURISH_PATH} />
                  </svg>
                </span>
                <span className={cn(styles.cornerFlourish, styles.bottomLeft)}>
                  <svg viewBox="0 0 50 50">
                    <path d={FLOURISH_PATH} />
                  </svg>
                </span>
                <span
                  className={cn(styles.cornerFlourish, styles.bottomRight)}
                >
                  <svg viewBox="0 0 50 50">
                    <path d={FLOURISH_PATH} />
                  </svg>
                </span>

                {/* Wax seal */}
                <span className={styles.sealContainer}>
                  <span className={styles.sealGlow} />
                  <span className={styles.seal}>
                    <span className={styles.sealMonogram}>{monogram}</span>
                  </span>
                  <span
                    className={cn(styles.sealHalf, styles.sealHalfLeft)}
                  />
                  <span
                    className={cn(styles.sealHalf, styles.sealHalfRight)}
                  />
                  {showHint && (
                    <span className={styles.tapHint}>Tap to Open</span>
                  )}
                </span>

                {/* Glare effect */}
                <span className={styles.cardGlare} />
              </span>

              {/* FRONT FACE (Revealed) */}
              <span className={cn(styles.cardFace, styles.cardFront)}>
                <span className={styles.invitationContent}>
                  <span className={styles.invitationHeader}>
                    {headerText}
                  </span>

                  <h1 className={styles.coupleNames}>
                    {coupleNames.partner1}
                    {coupleNames.partner2 && (
                      <>
                        <span className={styles.ampersand}>&amp;</span>
                        {coupleNames.partner2}
                      </>
                    )}
                  </h1>

                  {data.heroImageUrl && (
                    <Image
                      className={styles.invitationPhoto}
                      src={data.heroImageUrl}
                      alt={`${coupleNames.partner1} and ${coupleNames.partner2}`}
                      width={100}
                      height={100}
                      unoptimized
                    />
                  )}

                  <span className={styles.eventDetails}>
                    <p className={styles.eventDate}>{formattedDate}</p>
                    <p className={styles.eventTime}>{data.eventTime}</p>
                    <p className={styles.eventVenue}>
                      <strong className={styles.venueName}>
                        {data.venue.name}
                      </strong>
                      {data.venue.address}
                    </p>
                  </span>

                  {data.rsvpUrl && (
                    <Link
                      href={data.rsvpUrl}
                      className={styles.rsvpButton}
                      onClick={(e) => e.stopPropagation()}
                    >
                      RSVP
                    </Link>
                  )}
                </span>

                {/* Glare effect for front face */}
                <span className={styles.cardGlare} />
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
