"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getFlipFlapThemeTokens } from "@/lib/invitation-themes";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { FlipFlapRevealProps, ConfettiPiece, CardState } from "./types";
import styles from "./FlipFlapReveal.module.css";

/**
 * Default placeholder photo URL
 */
const DEFAULT_PHOTO_URL =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop&crop=faces";

/**
 * Corner flourish SVG path for decorative corners
 */
const FLOURISH_PATH = "M5 5 Q5 25 25 25 Q25 5 45 5 Q25 5 25 25 Q5 25 5 45 Q5 25 5 5Z";

/**
 * Confetti configuration
 */
const CONFETTI_CONFIG = {
  particleCount: 50,
  gravity: 400,
  lifetime: 2500, // ms
};

/**
 * Create confetti particles with physics properties
 */
function createConfettiPieces(
  originX: number,
  originY: number,
  colors: string[],
  count: number
): ConfettiPiece[] {
  const shapes: ConfettiPiece["shape"][] = ["circle", "square", "diamond"];
  const pieces: ConfettiPiece[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 300 + 150;

    pieces.push({
      id: i,
      x: originX,
      y: originY,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 200, // Initial upward boost
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 720,
    });
  }

  return pieces;
}

/**
 * Hook for physics-based confetti animation
 */
function useConfetti(
  isActive: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
  colors: string[]
) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Early exit if not active - cleanup function will handle clearing
    if (!isActive || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const originX = rect.width / 2;
    const originY = rect.height - 60; // Near the seal

    const initialPieces = createConfettiPieces(
      originX,
      originY,
      colors,
      CONFETTI_CONFIG.particleCount
    );
    setPieces(initialPieces);
    startTimeRef.current = null;

    const { gravity, lifetime } = CONFETTI_CONFIG;
    const deltaTime = 1 / 60;

    function animate(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      if (elapsed >= lifetime) {
        setPieces([]);
        return;
      }

      setPieces((prev) =>
        prev.map((piece) => ({
          ...piece,
          x: piece.x + piece.vx * deltaTime,
          y: piece.y + piece.vy * deltaTime + 0.5 * gravity * deltaTime ** 2,
          vy: piece.vy + gravity * deltaTime,
          rotation: piece.rotation + piece.rotationSpeed * deltaTime,
        }))
      );

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clear pieces when effect cleans up (isActive becomes false)
      setPieces([]);
    };
  }, [isActive, colors, containerRef]);

  return pieces;
}

/**
 * Extract monogram from invitation data
 */
function getMonogram(data: FlipFlapRevealProps["data"]): string {
  if (data.monogram) return data.monogram;

  const p1 = data.person1Name;
  const p2 = data.person2Name;

  if (p1 && p2) {
    return `${p1[0]} & ${p2[0]}`;
  }

  const parts = data.coupleNames.split(/[&,]/);
  if (parts.length >= 2) {
    const first = parts[0].trim()[0] || "";
    const second = parts[1].trim()[0] || "";
    return `${first} & ${second}`;
  }

  return data.coupleNames.substring(0, 3).toUpperCase();
}

/**
 * Extract couple names as partner1 and partner2
 */
function getCoupleNames(data: FlipFlapRevealProps["data"]): {
  partner1: string;
  partner2: string;
} {
  if (data.person1Name && data.person2Name) {
    return { partner1: data.person1Name, partner2: data.person2Name };
  }

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
 * FlipFlapReveal — Premium wedding invitation with book-style flip animation
 *
 * Features:
 * - Book-style hinge flip animation
 * - Photo cover with couple's image
 * - Physics-based confetti burst on reveal
 * - Wax seal that fades on open
 * - Theme-aware styling via CSS variables
 * - Keyboard accessible with reduced motion support
 */
export function FlipFlapReveal({
  data,
  initialState,
  onStateChange,
  showCloseButton = true,
  showHint = true,
  disableConfetti = false,
  className,
}: FlipFlapRevealProps) {
  // Refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // State
  const [cardState, setCardState] = useState<CardState>({
    isOpen: initialState === "open",
    isAnimating: false,
  });
  const [showConfettiAnimation, setShowConfettiAnimation] = useState(false);

  // Reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  // Theme-based confetti colors
  const confettiColors = useMemo(
    () => [
      "var(--ffr-confetti-1)",
      "var(--ffr-confetti-2)",
      "var(--ffr-confetti-3)",
      "var(--ffr-confetti-4)",
      "var(--ffr-confetti-5)",
    ],
    []
  );

  // Confetti animation
  const confettiPieces = useConfetti(
    showConfettiAnimation && !disableConfetti && !prefersReducedMotion,
    wrapperRef,
    confettiColors
  );

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      if (cardState.isAnimating) {
        onStateChange(cardState.isOpen ? "opening" : "closing");
      } else {
        onStateChange(cardState.isOpen ? "open" : "idle");
      }
    }
  }, [cardState.isOpen, cardState.isAnimating, onStateChange]);

  // Extract data
  const coupleNames = useMemo(() => getCoupleNames(data), [data]);
  const monogram = useMemo(() => getMonogram(data), [data]);
  const headerText = data.headerText || "Together with their families";
  const eventTypeText = data.eventTypeText || "Request the pleasure of your company";
  const formattedDate = useMemo(
    () => formatEventDate(data.eventDate, "en-US"),
    [data.eventDate]
  );

  // Photo URL - use heroImageUrl with fallback
  const photoUrl = data.heroImageUrl || DEFAULT_PHOTO_URL;

  /**
   * Handle card open
   */
  const handleOpen = useCallback(() => {
    if (cardState.isAnimating || cardState.isOpen) return;

    setCardState({ isOpen: true, isAnimating: true });

    // Trigger confetti after seal breaks
    setTimeout(() => {
      setShowConfettiAnimation(true);
    }, 400);

    // Animation complete
    setTimeout(() => {
      setCardState({ isOpen: true, isAnimating: false });
      setShowConfettiAnimation(false);
    }, 1500);
  }, [cardState.isAnimating, cardState.isOpen]);

  /**
   * Handle card close
   */
  const handleClose = useCallback(() => {
    if (cardState.isAnimating || !cardState.isOpen) return;

    setCardState({ isOpen: false, isAnimating: true });

    setTimeout(() => {
      setCardState({ isOpen: false, isAnimating: false });
    }, 1500);
  }, [cardState.isAnimating, cardState.isOpen]);

  /**
   * Handle card click (open only, use close button to close)
   */
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger if clicking RSVP or close button
      const target = e.target as HTMLElement;
      if (
        target.closest(`.${styles.rsvpBtn}`) ||
        target.closest(`.${styles.closeBtn}`)
      ) {
        return;
      }

      if (!cardState.isOpen) {
        handleOpen();
      }
    },
    [cardState.isOpen, handleOpen]
  );

  /**
   * Handle close button click
   */
  const handleCloseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleClose();
    },
    [handleClose]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!cardState.isOpen) {
          handleOpen();
        }
      }

      if (e.key === "Escape" && cardState.isOpen) {
        handleClose();
      }
    },
    [cardState.isOpen, handleOpen, handleClose]
  );

  // Get theme tokens (use ivory as default, themes are applied via InvitationShell)
  const themeTokens = useMemo(() => getFlipFlapThemeTokens("ivory"), []);

  // Build inline style with theme tokens
  const wrapperStyle = useMemo(() => {
    const styleObj: Record<string, string> = {};
    Object.entries(themeTokens).forEach(([key, value]) => {
      styleObj[key] = value;
    });
    return styleObj as React.CSSProperties;
  }, [themeTokens]);

  // Compute aria label
  const ariaLabel = useMemo(() => {
    const names = `${coupleNames.partner1} and ${coupleNames.partner2}`;
    return cardState.isOpen
      ? `Wedding invitation from ${names}. Press Escape or click close to close.`
      : `Wedding invitation from ${names}. Tap or press Enter to open.`;
  }, [coupleNames, cardState.isOpen]);

  return (
    <div className={cn("flex min-h-screen items-center justify-center p-4", className)}>
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        style={wrapperStyle}
      >
        {/* Confetti Layer */}
        {confettiPieces.length > 0 && (
          <div className={styles.confettiContainer} aria-hidden="true">
            {confettiPieces.map((piece) => (
              <div
                key={piece.id}
                className={cn(
                  styles.confettiPiece,
                  piece.shape === "circle" && styles.confettiCircle,
                  piece.shape === "diamond" && styles.confettiDiamond
                )}
                style={{
                  left: piece.x,
                  top: piece.y,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Invitation Card */}
        <div
          ref={cardRef}
          className={cn(styles.card, cardState.isOpen && styles.isOpen)}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-expanded={cardState.isOpen}
          onClick={handleCardClick}
          onKeyDown={handleKeyDown}
        >
          {/* Close Button */}
          {showCloseButton && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleCloseClick}
              aria-label="Close invitation"
              tabIndex={cardState.isOpen ? 0 : -1}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Inner Content (revealed when flap opens) */}
          <div className={styles.cardContent}>
            <div className={styles.contentInner}>
              <p className={styles.invitationHeader}>{headerText}</p>

              <h1 className={styles.coupleNames}>
                {coupleNames.partner1}
                <span className={styles.ampersand}>&amp;</span>
                {coupleNames.partner2}
              </h1>

              <div className={styles.divider} aria-hidden="true" />

              <p className={styles.invitationHeader}>{eventTypeText}</p>

              <div className={styles.eventDetails}>
                <p className={styles.eventDate}>{formattedDate}</p>
                <p className={styles.eventTime}>{data.eventTime}</p>
                <p className={styles.eventVenue}>
                  <strong>{data.venue.name}</strong>
                  {data.venue.address}
                </p>
              </div>

              {data.rsvpUrl && (
                <Link
                  href={data.rsvpUrl}
                  className={styles.rsvpBtn}
                  onClick={(e) => e.stopPropagation()}
                >
                  Kindly Respond
                </Link>
              )}
            </div>
          </div>

          {/* Flap (Cover) - Flips open */}
          <div className={styles.cardFlap}>
            {/* FRONT of flap (Photo + Seal) */}
            <div className={styles.flapFront}>
              {/* Corner flourishes */}
              <div className={cn(styles.cornerFlourish, styles.topLeft)}>
                <svg viewBox="0 0 50 50" aria-hidden="true">
                  <path d={FLOURISH_PATH} />
                </svg>
              </div>
              <div className={cn(styles.cornerFlourish, styles.topRight)}>
                <svg viewBox="0 0 50 50" aria-hidden="true">
                  <path d={FLOURISH_PATH} />
                </svg>
              </div>
              <div className={cn(styles.cornerFlourish, styles.bottomLeft)}>
                <svg viewBox="0 0 50 50" aria-hidden="true">
                  <path d={FLOURISH_PATH} />
                </svg>
              </div>
              <div className={cn(styles.cornerFlourish, styles.bottomRight)}>
                <svg viewBox="0 0 50 50" aria-hidden="true">
                  <path d={FLOURISH_PATH} />
                </svg>
              </div>

              {/* Photo Frame */}
              <div className={styles.photoFrame}>
                <Image
                  className={styles.couplePhoto}
                  src={photoUrl}
                  alt={`${coupleNames.partner1} and ${coupleNames.partner2}`}
                  fill
                  sizes="(max-width: 400px) 260px, 292px"
                  style={{ objectFit: "cover" }}
                  priority
                  unoptimized={photoUrl.startsWith("http")}
                />
                {/* Names overlay on photo */}
                <div className={styles.photoNamesOverlay}>
                  <p className={styles.photoNames}>
                    {coupleNames.partner1}{" "}
                    <span className={styles.amp}>&amp;</span>{" "}
                    {coupleNames.partner2}
                  </p>
                </div>
              </div>

              {/* Wax Seal at bottom */}
              <div className={styles.sealArea}>
                <div className={styles.seal}>
                  <span className={styles.sealMonogram}>{monogram}</span>
                </div>
                {showHint && <span className={styles.tapHint}>Tap to Open</span>}
              </div>
            </div>

            {/* BACK of flap (visible when opened) */}
            <div className={styles.flapBack}>
              <div className={styles.flapBackContent}>
                <p className={styles.flapBackText}>You&apos;re Invited</p>
                <p className={styles.flapBackDate}>{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlipFlapReveal;
