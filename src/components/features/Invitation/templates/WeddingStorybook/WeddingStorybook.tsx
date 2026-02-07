"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getStorybookThemeTokens } from "@/lib/invitation-themes";
import type { WeddingStorybookProps, StorybookTheme } from "./types";
import {
  PAGE_NAMES,
  PAGE_COUNT,
  ROMAN_NUMERALS,
  FLOURISH_SVG_PATH,
  DEFAULT_STORY,
  DEFAULT_SCHEDULE,
  DEFAULT_CELEBRATION,
  DEFAULT_THANK_YOU_MESSAGE,
} from "./constants";
import {
  useStorybookNav,
  useKeyboardNav,
  useSwipeGesture,
  useParticleBurst,
  useFlipPerformance,
} from "./hooks";
import styles from "./WeddingStorybook.module.css";

// ============================================
// SVG ICONS (inline, no external dependency)
// ============================================

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ============================================
// SHARED SUB-COMPONENTS
// ============================================

function CornerFlourishes() {
  const positions = [
    { cls: styles.topLeft, label: "top-left" },
    { cls: styles.topRight, label: "top-right" },
    { cls: styles.bottomLeft, label: "bottom-left" },
    { cls: styles.bottomRight, label: "bottom-right" },
  ] as const;

  return (
    <>
      {positions.map(({ cls, label }) => (
        <div key={label} className={cn(styles.cornerFlourish, cls)}>
          <svg viewBox="0 0 50 50" fill="currentColor">
            <path d={FLOURISH_SVG_PATH} opacity="0.6" />
            <circle cx="8" cy="8" r="2" opacity="0.4" />
          </svg>
        </div>
      ))}
    </>
  );
}

function Divider({ ornament = "\u2726" }: { ornament?: string }) {
  return (
    <div className={styles.divider}>
      <span className={styles.ornament}>{ornament}</span>
    </div>
  );
}

function PageTexture() {
  return <div className={styles.pageTexture} />;
}

/**
 * Wraps children in staggered reveal animation.
 * Each direct child gets an incremental delay.
 */
function RevealGroup({
  visible,
  isCover = false,
  children,
}: {
  visible: boolean;
  isCover?: boolean;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <>
      {items
        .filter((child) => child != null && child !== false)
        .map((child, i) => (
          <div
            key={i}
            className={cn(
              isCover ? styles.coverVisible : styles.revealChild,
              !isCover && visible && styles.visible
            )}
            style={
              !isCover
                ? ({ "--stagger-index": i } as React.CSSProperties)
                : undefined
            }
          >
            {child}
          </div>
        ))}
    </>
  );
}

// ============================================
// PAGE SPREAD COMPONENTS
// ============================================

/**
 * Cover Left page: couple photo + monogram + date banner
 */
function CoverLeft({
  couplePhotoUrl,
  couplePhotoAlt,
  monogramL1,
  monogramL2,
  weddingDate,
}: {
  couplePhotoUrl?: string;
  couplePhotoAlt: string;
  monogramL1: string;
  monogramL2: string;
  weddingDate: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      {couplePhotoUrl && (
        <div className={styles.couplePhotoFrame}>
          <img
            src={couplePhotoUrl}
            alt={couplePhotoAlt}
            className={styles.couplePhoto}
            loading="eager"
          />
        </div>
      )}
      <div
        className="flex items-center gap-2"
        style={{ fontFamily: "var(--inv-font-script, var(--font-script))" }}
      >
        <span className={styles.monogramLetter}>{monogramL1}</span>
        <span className={styles.monogramAmpersand}>&amp;</span>
        <span className={styles.monogramLetter}>{monogramL2}</span>
      </div>
      <div className={styles.dateBanner}>{weddingDate}</div>
    </div>
  );
}

/**
 * Cover Right page: formal invitation text
 */
function CoverRight({
  familiesText,
  person1,
  person2,
  formalDateLines,
  venueName,
  venueLocation,
}: {
  familiesText: string;
  person1: string;
  person2: string;
  formalDateLines: string[];
  venueName: string;
  venueLocation: string;
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ fontFamily: "var(--inv-font-heading, var(--font-heading))" }}
    >
      <span
        className={styles.familiesText}
        style={{ fontFamily: "var(--inv-font-body, var(--font-body))" }}
      >
        {familiesText}
      </span>
      <div
        className="my-4"
        style={{ fontFamily: "var(--inv-font-script, var(--font-script))" }}
      >
        <span className={styles.coupleName}>{person1}</span>
        <span className={styles.namesAmpersand}>&amp;</span>
        <span className={styles.coupleName}>{person2}</span>
      </div>
      <span
        className={styles.inviteLine}
        style={{ fontFamily: "var(--inv-font-body, var(--font-body))" }}
      >
        Request the pleasure of your company
      </span>
      <span
        className={styles.inviteLine}
        style={{ fontFamily: "var(--inv-font-body, var(--font-body))" }}
      >
        at the celebration of their marriage
      </span>
      <Divider />
      {formalDateLines.map((line, i) => (
        <span
          key={i}
          className={styles.detailValue}
          style={{ fontSize: "clamp(0.95rem, 2vw, 1.2rem)" }}
        >
          {line}
        </span>
      ))}
      <span className={styles.weddingVenue}>
        {venueName} {venueLocation && `\u00B7 ${venueLocation}`}
      </span>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * WeddingStorybook - A premium animated wedding invitation
 * presented as a multi-page book with 3D page-flip transitions.
 *
 * Features:
 * - 6-page book with 3D CSS page flips
 * - Left static page with dynamic content switching (desktop)
 * - Mobile supplements that preserve left-page content on small screens
 * - Directional particle bursts from the spine
 * - Theme integration with platform colors
 * - Keyboard, touch/swipe, and dot navigation
 * - Reduced motion support
 * - Controlled or uncontrolled page state
 */
export function WeddingStorybook({
  data,
  initialState,
  onStateChange,
  theme = "ivory",
  disableParticles = false,
  showHint = true,
  defaultPage = 0,
  page: controlledPage,
  onPageChange,
  className,
}: WeddingStorybookProps) {
  // Refs
  const storybookRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);

  // Extract data from InvitationData
  const person1Name = data.person1Name || data.coupleNames.split(" & ")[0] || data.coupleNames.split(" and ")[0] || "Partner";
  const person2Name = data.person2Name || data.coupleNames.split(" & ")[1] || data.coupleNames.split(" and ")[1] || "Partner";

  // Derived values
  const monogramL1 = data.monogram?.charAt(0)?.toUpperCase() || person1Name.charAt(0).toUpperCase();
  const monogramL2 = data.monogram?.charAt(2)?.toUpperCase() || person2Name.charAt(0).toUpperCase();
  const photoAlt = `${person1Name} and ${person2Name}`;

  // Format the wedding date
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(data.eventDate);

  const formalDateLines = [formattedDate];

  // Venue info
  const venueName = data.venue.name;
  const venueLocation = data.venue.city;
  const venueAddress = data.venue.address;

  // Story content (use custom message as story text or defaults)
  const storyText = data.customMessage || DEFAULT_STORY.text;
  const storyQuote = DEFAULT_STORY.quote;
  const storyQuoteAttribution = DEFAULT_STORY.quoteAttribution;

  // Schedule (use event time for first item)
  const schedule = [
    { time: data.eventTime, activity: "Ceremony" },
    ...DEFAULT_SCHEDULE.slice(1),
  ];

  // Celebration details
  const celebration = {
    ...DEFAULT_CELEBRATION,
    attire: data.dressCode || DEFAULT_CELEBRATION.attire,
  };

  // Get theme tokens
  const themeTokens = getStorybookThemeTokens(theme);

  // Hooks
  const reducedMotion = useReducedMotion();

  const nav = useStorybookNav({
    defaultPage: initialState === "open" ? 1 : defaultPage,
    controlledPage,
    onPageChange,
  });

  useKeyboardNav(nav.goToPage, nav.currentPage);

  const { enablePerformance } = useFlipPerformance(bookRef);

  const { burst } = useParticleBurst({
    containerRef: particleRef,
    bookRef,
    disabled: disableParticles,
    reducedMotion,
  });

  useSwipeGesture({
    targetRef: storybookRef,
    tiltRef: bookRef,
    onSwipeForward: nav.nextPage,
    onSwipeBackward: nav.prevPage,
    reducedMotion,
  });

  // Map page state to InvitationState
  useEffect(() => {
    if (onStateChange) {
      if (nav.currentPage === 0) {
        onStateChange("idle");
      } else if (nav.direction) {
        onStateChange("opening");
        // After animation completes, switch to "open"
        const timeout = setTimeout(() => {
          onStateChange("open");
        }, 1200);
        return () => clearTimeout(timeout);
      } else {
        onStateChange("open");
      }
    }
  }, [nav.currentPage, nav.direction, onStateChange]);

  // Fire particles on page change
  const prevPageRef = useRef(nav.currentPage);
  useEffect(() => {
    if (nav.currentPage !== prevPageRef.current) {
      enablePerformance();
      if (nav.direction) burst(nav.direction);
      prevPageRef.current = nav.currentPage;
    }
  }, [nav.currentPage, nav.direction, burst, enablePerformance]);

  // ARIA page announcement
  const announceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.textContent = `Page ${nav.currentPage + 1}: ${PAGE_NAMES[nav.currentPage]}`;
    }
  }, [nav.currentPage]);

  // Navigate with GPU hint
  const navigateTo = useCallback(
    (index: number) => {
      enablePerformance();
      nav.goToPage(index);
    },
    [enablePerformance, nav]
  );

  // Determine which pages are flipped
  const isFlipped = (leafIndex: number) => nav.currentPage >= leafIndex;

  // Determine which pages have visible content
  //
  // For the book spread model:
  //   - Leaf N FRONT = right page of spread (N-1)
  //   - Leaf N BACK  = left page of spread N (visible after flip)
  //
  // Fronts become visible when they're the "next unflipped" page,
  // i.e. when currentPage >= pageIndex - 1.
  const isContentVisible = (pageIndex: number, side: "front" | "back") => {
    if (pageIndex === 1 && side === "front") return true; // Cover always visible
    if (side === "back") return isFlipped(pageIndex);
    // Front of leaf N is the right page of spread N-1
    if (side === "front") return nav.currentPage >= pageIndex - 1;
    return false;
  };

  // Z-index for currently flipping page (data attribute)
  const getFlipIndex = (leafIndex: number) => {
    if (leafIndex === nav.currentPage && nav.direction === "forward")
      return "top";
    if (leafIndex === nav.currentPage + 1 && nav.direction === "backward")
      return "top";
    return undefined;
  };

  // Dynamic z-index based on current page
  // The most recently flipped page (current) needs highest z-index among flipped pages
  const getDynamicZIndex = (leafIndex: number): number => {
    const isPageFlipped = nav.currentPage >= leafIndex;

    if (isPageFlipped) {
      // Current page (the one we're viewing) gets highest z-index among flipped
      if (leafIndex === nav.currentPage) {
        return 15;
      }
      // Earlier flipped pages: higher leaf index = flipped more recently = higher z
      return 10 + leafIndex;
    } else {
      // Unflipped pages: first unflipped (next page) should be on top
      return 6 - (leafIndex - nav.currentPage);
    }
  };

  // Build inline style with theme tokens (CSS custom properties)
  const wrapperStyle = themeTokens as unknown as React.CSSProperties;

  return (
    <div
      className={cn(styles.wrapper, styles.backdrop, className)}
      style={wrapperStyle}
    >
      {/* ARIA live region */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Ambient floating petals */}
      <div className={styles.petalsContainer} aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.ambientPetal} />
        ))}
      </div>

      {/* Particle burst container */}
      <div
        ref={particleRef}
        className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden"
        aria-hidden="true"
      />

      {/* The Storybook */}
      <div
        ref={storybookRef}
        className={styles.storybook}
        role="region"
        aria-label="Wedding invitation storybook"
        aria-roledescription="Book"
      >
        <div ref={bookRef} className={styles.book}>
          {/* ============================
              LEFT STATIC PAGE (Desktop)
              ============================ */}
          <div className={styles.pageStatic}>
            <PageTexture />

            {/* Spread 0: Cover */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 0 && styles.active,
                nav.currentPage !== 0 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 0} isCover>
                <CoverLeft
                  couplePhotoUrl={data.heroImageUrl}
                  couplePhotoAlt={photoAlt}
                  monogramL1={monogramL1}
                  monogramL2={monogramL2}
                  weddingDate={formattedDate}
                />
              </RevealGroup>
            </div>

            {/* Spread 1: Chapter One - Our Story (quote on left) */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 1 && styles.active,
                nav.currentPage !== 1 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 1}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  Our Journey
                </span>
                <p
                  className={cn(
                    styles.bodyText,
                    styles.bodyTextItalic,
                    styles.bodyTextNarrow
                  )}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                    marginBottom: "1rem",
                  }}
                >
                  &ldquo;{storyQuote}&rdquo;
                </p>
                <Divider ornament="\u2665" />
                <p
                  className={cn(styles.bodyText, styles.bodyTextSm)}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                  }}
                >
                  &mdash; {storyQuoteAttribution}
                </p>
              </RevealGroup>
            </div>

            {/* Spread 2: Chapter Two - The Details (schedule on left) */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 2 && styles.active,
                nav.currentPage !== 2 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 2}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  The Day
                </span>
                <h3
                  className={styles.serifHeading}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                  }}
                >
                  Schedule
                </h3>
                <div
                  className={cn(styles.detailsGrid, styles.detailsGridCompact)}
                  style={{ marginTop: "0.5rem" }}
                >
                  {schedule.map((item, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span
                        className={styles.detailLabel}
                        style={{
                          fontFamily: "var(--inv-font-body, var(--font-body))",
                        }}
                      >
                        {item.time}
                      </span>
                      <span
                        className={styles.detailValue}
                        style={{
                          fontFamily:
                            "var(--inv-font-heading, var(--font-heading))",
                          fontSize: "1rem",
                        }}
                      >
                        {item.activity}
                      </span>
                    </div>
                  ))}
                </div>
              </RevealGroup>
            </div>

            {/* Spread 3: The Venue (photo + address on left) */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 3 && styles.active,
                nav.currentPage !== 3 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 3}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  The Venue
                </span>
                {data.heroImageUrl && (
                  <div
                    className={cn(styles.photoFrame, styles.photoFrameVignette)}
                  >
                    <img
                      src={data.heroImageUrl}
                      alt={`${venueName} venue`}
                      loading="lazy"
                    />
                  </div>
                )}
                <h3
                  className={styles.serifHeadingSm}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                    marginTop: "0.75rem",
                  }}
                >
                  {venueName}
                </h3>
                <p
                  className={cn(styles.bodyText, styles.bodyTextSm)}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                    marginTop: "0.5rem",
                  }}
                >
                  {venueAddress}
                  <br />
                  {venueLocation}
                </p>
              </RevealGroup>
            </div>

            {/* Spread 4: Chapter Three - RSVP (CTA on left) */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 4 && styles.active,
                nav.currentPage !== 4 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 4}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  Chapter Three
                </span>
                <h3
                  className={cn(styles.scriptTitle, styles.scriptTitleMd)}
                  style={{
                    fontFamily: "var(--inv-font-script, var(--font-script))",
                  }}
                >
                  Will You Join Us?
                </h3>
                <p
                  className={styles.bodyText}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                    marginTop: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  Your presence would make our day complete. Please let us know
                  if you can celebrate with us.
                </p>
                <div style={{ maxWidth: "200px", width: "100%" }}>
                  <Link
                    href={data.rsvpUrl}
                    className={styles.rsvpButton}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    <CheckCircleIcon />
                    RSVP
                  </Link>
                </div>
              </RevealGroup>
            </div>

            {/* Spread 5: Forever & Always (closing quote, left page of final spread) */}
            <div
              className={cn(
                styles.leftContent,
                nav.currentPage === 5 && styles.active,
                nav.currentPage !== 5 && styles.exiting
              )}
            >
              <RevealGroup visible={nav.currentPage === 5}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  The End
                </span>
                <h3
                  className={cn(styles.scriptTitle, styles.scriptTitleMd)}
                  style={{
                    fontFamily: "var(--inv-font-script, var(--font-script))",
                  }}
                >
                  Forever &amp; Always
                </h3>
                <Divider ornament="&#x2665;" />
                <p
                  className={cn(styles.scriptTitle, styles.scriptTitleSm)}
                  style={{
                    fontFamily: "var(--inv-font-script, var(--font-script))",
                    marginTop: "0.5rem",
                  }}
                >
                  {person1Name} &amp; {person2Name}
                </p>
              </RevealGroup>
            </div>
          </div>

          {/* Prev button for desktop (inside .pageStatic would be covered by content) */}
          <button
            className={cn(
              styles.navControl,
              styles.navPrev,
              styles.staticNavPrev,
              !nav.canGoPrev && styles.navHidden
            )}
            onClick={() => navigateTo(nav.currentPage - 1)}
            aria-label="Turn to previous page"
          >
            <span className={styles.navLine} aria-hidden="true" />
            <span className={styles.navArrow} aria-hidden="true" />
          </button>

          {/* ============================
              PAGE 1: COVER
              ============================ */}
          <div
            className={cn(styles.pageLeaf, isFlipped(1) && styles.flipped)}
            data-page-leaf
            data-flip-index={getFlipIndex(1)}
            style={{ zIndex: getDynamicZIndex(1) }}
          >
            {/* Front: Cover */}
            <div className={styles.pageFront}>
              <PageTexture />
              <div className={cn(styles.pageContent, styles.framed)}>
                <CornerFlourishes />

                {/* Mobile-only: couple photo + monogram */}
                <div className={styles.mobileCoverHeader}>
                  {data.heroImageUrl && (
                    <div className={styles.couplePhotoFrame}>
                      <img
                        src={data.heroImageUrl}
                        alt={photoAlt}
                        className={styles.couplePhoto}
                        loading="eager"
                      />
                    </div>
                  )}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      fontFamily: "var(--inv-font-script, var(--font-script))",
                    }}
                  >
                    <span className={styles.monogramLetter}>{monogramL1}</span>
                    <span className={styles.monogramAmpersand}>&amp;</span>
                    <span className={styles.monogramLetter}>{monogramL2}</span>
                  </div>
                </div>

                <RevealGroup visible isCover>
                  <CoverRight
                    familiesText={data.headerText || "Together with their families"}
                    person1={person1Name}
                    person2={person2Name}
                    formalDateLines={formalDateLines}
                    venueName={venueName}
                    venueLocation={venueLocation}
                  />
                </RevealGroup>
              </div>

              {/* Turn hint */}
              {showHint && (
                <div
                  className={cn(
                    styles.turnHint,
                    nav.currentPage > 0 && styles.turnHintHidden
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Cover curl with pulse */}
              <div
                className={cn(styles.pageCurl, styles.coverCurl)}
                aria-hidden="true"
              />

              {/* Next button */}
              <button
                className={cn(
                  styles.navControl,
                  styles.navNext,
                  !nav.canGoNext && styles.navHidden
                )}
                onClick={() => navigateTo(1)}
                aria-label="Turn to next page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>

            {/* Back: Our Story (flips to left, but visible on mobile) */}
            <div className={styles.pageBack}>
              <PageTexture />
              <div className={styles.flipShadow} />
              <div className={styles.pageContent}>
                <RevealGroup visible={isContentVisible(1, "back")}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    Chapter One
                  </span>
                  <h2
                    className={styles.serifHeading}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    Our Story
                  </h2>
                  <p
                    className={styles.bodyText}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    {storyText}
                  </p>
                </RevealGroup>

                {/* Mobile supplement: quote from left page */}
                <div className={styles.mobileSupplement}>
                  <Divider ornament="\u2665" />
                  <p
                    className={cn(
                      styles.bodyText,
                      styles.bodyTextItalic,
                      styles.bodyTextNarrow
                    )}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    &ldquo;{storyQuote}&rdquo;
                  </p>
                  <p
                    className={cn(styles.bodyText, styles.bodyTextSm)}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                      marginTop: "0.5rem",
                    }}
                  >
                    &mdash; {storyQuoteAttribution}
                  </p>
                </div>
              </div>

              <button
                className={cn(
                  styles.navControl,
                  styles.navPrev,
                  !nav.canGoPrev && styles.navHidden
                )}
                onClick={() => navigateTo(0)}
                aria-label="Turn to previous page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ============================
              PAGE 2: CHAPTER TWO - THE DETAILS
              ============================ */}
          <div
            className={cn(styles.pageLeaf, isFlipped(2) && styles.flipped)}
            data-page-leaf
            data-flip-index={getFlipIndex(2)}
            style={{ zIndex: getDynamicZIndex(2) }}
          >
            {/* Front: RIGHT page of spread 1 — Chapter One: Our Story */}
            <div className={styles.pageFront}>
              <PageTexture />
              <div className={styles.pageContent}>
                {/* Desktop-only: full chapter content for the right page */}
                <div className={styles.desktopSpreadRight}>
                  <RevealGroup visible={isContentVisible(2, "front")}>
                    <span
                      className={styles.chapterLabel}
                      style={{
                        fontFamily: "var(--inv-font-body, var(--font-body))",
                      }}
                    >
                      Chapter One
                    </span>
                    <h2
                      className={styles.serifHeading}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      Our Story
                    </h2>
                    <p
                      className={styles.bodyText}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      {storyText}
                    </p>
                  </RevealGroup>
                </div>
              </div>
              <div className={styles.pageCurl} aria-hidden="true" />
              <button
                className={cn(
                  styles.navControl,
                  styles.navNext,
                  nav.currentPage >= PAGE_COUNT - 1 && styles.navHidden
                )}
                onClick={() => navigateTo(2)}
                aria-label="Turn to next page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>

            {/* Back: Chapter Two - The Details */}
            <div className={styles.pageBack}>
              <PageTexture />
              <div className={styles.flipShadow} />
              <div className={styles.pageContent}>
                <RevealGroup visible={isContentVisible(2, "back")}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    Chapter Two
                  </span>
                  <h2
                    className={styles.serifHeading}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    The Details
                  </h2>
                  <div className={styles.detailsGrid}>
                    <div className="flex flex-col items-center">
                      <CalendarIcon className={styles.detailIcon} />
                      <span
                        className={styles.detailLabel}
                        style={{
                          fontFamily: "var(--inv-font-body, var(--font-body))",
                        }}
                      >
                        Date
                      </span>
                      <span
                        className={styles.detailValue}
                        style={{
                          fontFamily:
                            "var(--inv-font-heading, var(--font-heading))",
                        }}
                      >
                        {formattedDate}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <ClockIcon className={styles.detailIcon} />
                      <span
                        className={styles.detailLabel}
                        style={{
                          fontFamily: "var(--inv-font-body, var(--font-body))",
                        }}
                      >
                        Time
                      </span>
                      <span
                        className={styles.detailValue}
                        style={{
                          fontFamily:
                            "var(--inv-font-heading, var(--font-heading))",
                        }}
                      >
                        {data.eventTime}
                      </span>
                    </div>
                  </div>
                </RevealGroup>
              </div>
              <button
                className={cn(styles.navControl, styles.navPrev)}
                onClick={() => navigateTo(1)}
                aria-label="Turn to previous page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ============================
              PAGE 3: THE VENUE / WHAT TO EXPECT
              ============================ */}
          <div
            className={cn(styles.pageLeaf, isFlipped(3) && styles.flipped)}
            data-page-leaf
            data-flip-index={getFlipIndex(3)}
            style={{ zIndex: getDynamicZIndex(3) }}
          >
            {/* Front: RIGHT page of spread 2 — Chapter Two: The Details */}
            <div className={styles.pageFront}>
              <PageTexture />
              <div className={styles.pageContent}>
                <div className={styles.desktopSpreadRight}>
                  <RevealGroup visible={isContentVisible(3, "front")}>
                    <span
                      className={styles.chapterLabel}
                      style={{
                        fontFamily: "var(--inv-font-body, var(--font-body))",
                      }}
                    >
                      Chapter Two
                    </span>
                    <h2
                      className={styles.serifHeading}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      The Details
                    </h2>
                    <div className={styles.detailsGrid}>
                      <div className="flex flex-col items-center">
                        <CalendarIcon className={styles.detailIcon} />
                        <span
                          className={styles.detailLabel}
                          style={{
                            fontFamily:
                              "var(--inv-font-body, var(--font-body))",
                          }}
                        >
                          Date
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{
                            fontFamily:
                              "var(--inv-font-heading, var(--font-heading))",
                          }}
                        >
                          {formattedDate}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <ClockIcon className={styles.detailIcon} />
                        <span
                          className={styles.detailLabel}
                          style={{
                            fontFamily:
                              "var(--inv-font-body, var(--font-body))",
                          }}
                        >
                          Time
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{
                            fontFamily:
                              "var(--inv-font-heading, var(--font-heading))",
                          }}
                        >
                          {data.eventTime}
                        </span>
                      </div>
                    </div>
                  </RevealGroup>
                </div>
              </div>
              <div className={styles.pageCurl} aria-hidden="true" />
              <button
                className={cn(
                  styles.navControl,
                  styles.navNext,
                  nav.currentPage >= PAGE_COUNT - 1 && styles.navHidden
                )}
                onClick={() => navigateTo(3)}
                aria-label="Turn to next page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>

            {/* Back: What to Expect */}
            <div className={styles.pageBack}>
              <PageTexture />
              <div className={styles.flipShadow} />
              <div className={styles.pageContent}>
                <RevealGroup visible={isContentVisible(3, "back")}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    What to Expect
                  </span>
                  <h2
                    className={styles.serifHeading}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    The Celebration
                  </h2>
                  <div className={styles.detailsGrid}>
                    {celebration.ceremonyLocation && (
                      <div className="flex flex-col items-center">
                        <span
                          className={styles.detailLabel}
                          style={{
                            fontFamily:
                              "var(--inv-font-body, var(--font-body))",
                          }}
                        >
                          Ceremony
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{
                            fontFamily:
                              "var(--inv-font-heading, var(--font-heading))",
                          }}
                        >
                          {celebration.ceremonyLocation}
                        </span>
                      </div>
                    )}
                    {celebration.receptionLocation && (
                      <div className="flex flex-col items-center">
                        <span
                          className={styles.detailLabel}
                          style={{
                            fontFamily:
                              "var(--inv-font-body, var(--font-body))",
                          }}
                        >
                          Reception
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{
                            fontFamily:
                              "var(--inv-font-heading, var(--font-heading))",
                          }}
                        >
                          {celebration.receptionLocation}
                        </span>
                      </div>
                    )}
                    {celebration.attire && (
                      <div className="flex flex-col items-center">
                        <span
                          className={styles.detailLabel}
                          style={{
                            fontFamily:
                              "var(--inv-font-body, var(--font-body))",
                          }}
                        >
                          Attire
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{
                            fontFamily:
                              "var(--inv-font-heading, var(--font-heading))",
                          }}
                        >
                          {celebration.attire}
                        </span>
                      </div>
                    )}
                  </div>
                </RevealGroup>

                {/* Mobile supplement: venue info from left page */}
                <div className={styles.mobileSupplement}>
                  {data.heroImageUrl && (
                    <div
                      className={cn(styles.photoFrame, styles.photoFrameSmall)}
                    >
                      <img
                        src={data.heroImageUrl}
                        alt={`${venueName} venue`}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <p
                    className={styles.bodyText}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                      marginTop: "0.5rem",
                    }}
                  >
                    {venueName}
                    <br />
                    {venueAddress}, {venueLocation}
                  </p>
                </div>
              </div>
              <button
                className={cn(styles.navControl, styles.navPrev)}
                onClick={() => navigateTo(2)}
                aria-label="Turn to previous page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ============================
              PAGE 4: CHAPTER THREE - RSVP / WITH LOVE
              ============================ */}
          <div
            className={cn(styles.pageLeaf, isFlipped(4) && styles.flipped)}
            data-page-leaf
            data-flip-index={getFlipIndex(4)}
            style={{ zIndex: getDynamicZIndex(4) }}
          >
            {/* Front: RIGHT page of spread 3 — What to Expect */}
            <div className={styles.pageFront}>
              <PageTexture />
              <div className={styles.pageContent}>
                <div className={styles.desktopSpreadRight}>
                  <RevealGroup visible={isContentVisible(4, "front")}>
                    <span
                      className={styles.chapterLabel}
                      style={{
                        fontFamily: "var(--inv-font-body, var(--font-body))",
                      }}
                    >
                      What to Expect
                    </span>
                    <h2
                      className={styles.serifHeading}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      The Celebration
                    </h2>
                    <div className={styles.detailsGrid}>
                      {celebration.ceremonyLocation && (
                        <div className="flex flex-col items-center">
                          <span
                            className={styles.detailLabel}
                            style={{
                              fontFamily:
                                "var(--inv-font-body, var(--font-body))",
                            }}
                          >
                            Ceremony
                          </span>
                          <span
                            className={styles.detailValue}
                            style={{
                              fontFamily:
                                "var(--inv-font-heading, var(--font-heading))",
                            }}
                          >
                            {celebration.ceremonyLocation}
                          </span>
                        </div>
                      )}
                      {celebration.receptionLocation && (
                        <div className="flex flex-col items-center">
                          <span
                            className={styles.detailLabel}
                            style={{
                              fontFamily:
                                "var(--inv-font-body, var(--font-body))",
                            }}
                          >
                            Reception
                          </span>
                          <span
                            className={styles.detailValue}
                            style={{
                              fontFamily:
                                "var(--inv-font-heading, var(--font-heading))",
                            }}
                          >
                            {celebration.receptionLocation}
                          </span>
                        </div>
                      )}
                      {celebration.attire && (
                        <div className="flex flex-col items-center">
                          <span
                            className={styles.detailLabel}
                            style={{
                              fontFamily:
                                "var(--inv-font-body, var(--font-body))",
                            }}
                          >
                            Attire
                          </span>
                          <span
                            className={styles.detailValue}
                            style={{
                              fontFamily:
                                "var(--inv-font-heading, var(--font-heading))",
                            }}
                          >
                            {celebration.attire}
                          </span>
                        </div>
                      )}
                    </div>
                  </RevealGroup>
                </div>
              </div>
              <div className={styles.pageCurl} aria-hidden="true" />
              <button
                className={cn(
                  styles.navControl,
                  styles.navNext,
                  nav.currentPage >= PAGE_COUNT - 1 && styles.navHidden
                )}
                onClick={() => navigateTo(4)}
                aria-label="Turn to next page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>

            {/* Back: With Love / Thank You */}
            <div className={styles.pageBack}>
              <PageTexture />
              <div className={styles.flipShadow} />
              <div className={cn(styles.pageContent, styles.framed)}>
                <RevealGroup visible={isContentVisible(4, "back")}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    With Love
                  </span>
                  <h2
                    className={styles.serifHeading}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    Thank You
                  </h2>
                  <Divider ornament="\u2665" />
                  <p
                    className={styles.bodyText}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    {DEFAULT_THANK_YOU_MESSAGE}
                  </p>
                  <div style={{ marginTop: "1.5rem" }}>
                    <p
                      className={cn(styles.scriptTitle, styles.scriptTitleSm)}
                      style={{
                        fontFamily:
                          "var(--inv-font-script, var(--font-script))",
                      }}
                    >
                      {person1Name} &amp; {person2Name}
                    </p>
                  </div>
                </RevealGroup>

                {/* Mobile supplement: RSVP CTA from left page */}
                <div className={styles.mobileSupplement}>
                  <div style={{ maxWidth: "200px", width: "100%" }}>
                    <Link
                      href={data.rsvpUrl}
                      className={styles.rsvpButton}
                      style={{
                        fontFamily: "var(--inv-font-body, var(--font-body))",
                      }}
                    >
                      <CheckCircleIcon />
                      RSVP Now
                    </Link>
                  </div>
                </div>
              </div>
              <button
                className={cn(styles.navControl, styles.navPrev)}
                onClick={() => navigateTo(3)}
                aria-label="Turn to previous page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ============================
              PAGE 5: WITH GRATITUDE / STAY CONNECTED
              ============================ */}
          <div
            className={cn(styles.pageLeaf, isFlipped(5) && styles.flipped)}
            data-page-leaf
            data-flip-index={getFlipIndex(5)}
            style={{ zIndex: getDynamicZIndex(5) }}
          >
            {/* Front: RIGHT page of spread 4 — Thank You */}
            <div className={styles.pageFront}>
              <PageTexture />
              <div className={styles.pageContent}>
                <div className={styles.desktopSpreadRight}>
                  <RevealGroup visible={isContentVisible(5, "front")}>
                    <span
                      className={styles.chapterLabel}
                      style={{
                        fontFamily: "var(--inv-font-body, var(--font-body))",
                      }}
                    >
                      With Love
                    </span>
                    <h2
                      className={styles.serifHeading}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      Thank You
                    </h2>
                    <Divider ornament="\u2665" />
                    <p
                      className={styles.bodyText}
                      style={{
                        fontFamily:
                          "var(--inv-font-heading, var(--font-heading))",
                      }}
                    >
                      {DEFAULT_THANK_YOU_MESSAGE}
                    </p>
                    <div style={{ marginTop: "1.5rem" }}>
                      <p
                        className={cn(styles.scriptTitle, styles.scriptTitleSm)}
                        style={{
                          fontFamily:
                            "var(--inv-font-script, var(--font-script))",
                        }}
                      >
                        {person1Name} &amp; {person2Name}
                      </p>
                    </div>
                  </RevealGroup>
                </div>
              </div>
              <div className={styles.pageCurl} aria-hidden="true" />
              <button
                className={cn(
                  styles.navControl,
                  styles.navNext,
                  nav.currentPage >= PAGE_COUNT - 1 && styles.navHidden
                )}
                onClick={() => navigateTo(5)}
                aria-label="Turn to next page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>

            {/* Back: LEFT page of spread 5 — Forever & Always
                 On mobile this is the primary visible page for
                 spread 5, with Stay Connected as supplement. */}
            <div className={styles.pageBack}>
              <PageTexture />
              <div className={styles.flipShadow} />
              <div className={styles.pageContent}>
                <RevealGroup visible={isContentVisible(5, "back")}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    The End
                  </span>
                  <h3
                    className={cn(styles.scriptTitle, styles.scriptTitleMd)}
                    style={{
                      fontFamily: "var(--inv-font-script, var(--font-script))",
                    }}
                  >
                    Forever &amp; Always
                  </h3>
                  <Divider ornament="&#x2665;" />
                  <p
                    className={cn(styles.scriptTitle, styles.scriptTitleSm)}
                    style={{
                      fontFamily: "var(--inv-font-script, var(--font-script))",
                      marginTop: "0.5rem",
                    }}
                  >
                    {person1Name} &amp; {person2Name}
                  </p>
                </RevealGroup>

                {/* Mobile supplement: Stay Connected (right page content) */}
                <div className={styles.mobileSupplement}>
                  <span
                    className={styles.chapterLabel}
                    style={{
                      fontFamily: "var(--inv-font-body, var(--font-body))",
                    }}
                  >
                    Stay Connected
                  </span>
                  <p
                    className={styles.bodyText}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                    }}
                  >
                    For any inquiries, please contact us.
                  </p>
                  <p
                    className={cn(styles.bodyText, styles.bodyTextSm)}
                    style={{
                      fontFamily:
                        "var(--inv-font-heading, var(--font-heading))",
                      marginTop: "0.5rem",
                    }}
                  >
                    We look forward to celebrating with you!
                  </p>
                </div>
              </div>
              <button
                className={cn(styles.navControl, styles.navPrev)}
                onClick={() => navigateTo(4)}
                aria-label="Turn to previous page"
              >
                <span className={styles.navLine} aria-hidden="true" />
                <span className={styles.navArrow} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ============================
              BACK COVER (right page of final spread)
              Desktop only — sits behind all leaves at z-index 1.
              When all 5 leaves are flipped, this is exposed as
              the right page of spread 5. Hidden on mobile where
              leaf 5 BACK's mobile supplement provides this content.
              ============================ */}
          <div className={styles.backCover}>
            <PageTexture />
            <div className={styles.pageContent}>
              <RevealGroup visible={nav.currentPage === PAGE_COUNT - 1}>
                <span
                  className={styles.chapterLabel}
                  style={{
                    fontFamily: "var(--inv-font-body, var(--font-body))",
                  }}
                >
                  Stay Connected
                </span>
                <h2
                  className={styles.serifHeading}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                  }}
                >
                  Questions?
                </h2>
                <p
                  className={styles.bodyText}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                  }}
                >
                  For any inquiries, please contact us.
                </p>
                <Divider />
                <p
                  className={cn(styles.bodyText, styles.bodyTextSm)}
                  style={{
                    fontFamily:
                      "var(--inv-font-heading, var(--font-heading))",
                    marginTop: "0.5rem",
                  }}
                >
                  We look forward to celebrating with you!
                </p>
              </RevealGroup>
            </div>
          </div>
        </div>

        {/* ============================
            PAGE INDICATOR
            ============================ */}
        <div className={styles.pageIndicator}>
          <div className="flex gap-2" role="tablist" aria-label="Page navigation">
            {PAGE_NAMES.map((name, i) => (
              <button
                key={i}
                className={cn(
                  styles.pageDot,
                  i === nav.currentPage && styles.pageDotActive
                )}
                role="tab"
                aria-label={`Page ${i + 1}: ${name}`}
                aria-selected={i === nav.currentPage}
                onClick={() => navigateTo(i)}
              />
            ))}
          </div>
          <span
            className={styles.pageNumber}
            aria-hidden="true"
            style={{
              fontFamily: "var(--inv-font-heading, var(--font-heading))",
            }}
          >
            {ROMAN_NUMERALS[nav.currentPage]} of vi
          </span>
        </div>
      </div>
    </div>
  );
}
