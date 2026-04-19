"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getStorybookThemeTokens } from "@/lib/invitation-themes";
import type { InvitationData } from "@/schemas/invitation";
import { BookPage } from "./BookPage";
import { Confetti } from "./Confetti";
import {
  CoverLeft,
  CoverRight,
  StoryLeft,
  StoryRight,
  TimelineLeft,
  TimelineRight,
  DetailsLeft,
  DetailsRight,
  RSVPLeft,
  RSVPRight,
} from "./pages";
import { playfair, cormorant, pinyon } from "./fonts";
import type { WeddingStorybookProps, StorybookData, PageVariant, SpreadLabel } from "./types";
import { TOTAL_SPREADS, SPREAD_LABELS } from "./types";
import styles from "./WeddingStorybook.module.css";

/**
 * Maps InvitationData (platform schema) to StorybookData (internal POC format).
 */
function mapToStorybook(data: InvitationData): StorybookData {
  const eventDate = new Date(data.eventDate);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedDate = dateFormatter.format(eventDate);
  const year = eventDate.getFullYear().toString();

  return {
    person1: data.person1Name || data.coupleNames.split(/\s*[&+]\s*/)[0] || "",
    person2: data.person2Name || data.coupleNames.split(/\s*[&+]\s*/)[1] || "",
    date: formattedDate,
    year,
    ceremonyDate: data.ceremonyDate,
    ceremonyTime: data.ceremonyTime || data.eventTime,
    ceremonyVenue: data.ceremonyVenue || data.venue.name,
    ceremonyAddress: data.ceremonyAddress || [data.venue.address, data.venue.city].filter(Boolean).join(", "),
    receptionDate: data.receptionDate,
    receptionTime: data.receptionTime || undefined,
    receptionVenue: data.receptionVenue || undefined,
    receptionAddress: data.receptionAddress || undefined,
    headerMode: data.headerMode,
    headerText: data.headerText,
    person1FamilyName: data.person1FamilyName,
    person2FamilyName: data.person2FamilyName,
    familyInviteText: data.familyInviteText,
    dressCode: data.dressCode,
    rsvpUrl: data.rsvpUrl,
    rsvpDeadline: data.rsvpDeadline,
    monogram: data.monogram,
    couplePhotoUrl: data.couplePhotoUrl,
    venuePhotoUrl: data.venuePhotoUrl,
    story: data.storyHeading || data.storyParagraphs
      ? {
          heading: data.storyHeading || "How We Met",
          paragraphs: data.storyParagraphs || [],
        }
      : data.customMessage
        ? { heading: "Our Story", paragraphs: [data.customMessage] }
        : undefined,
    timeline: data.timeline,
    quote: data.person1Quote
      ? { text: data.person1Quote, attribution: data.person1QuoteAttr }
      : undefined,
    groomQuote: data.person2Quote
      ? { text: data.person2Quote, attribution: data.person2QuoteAttr }
      : undefined,
  };
}

/**
 * 3D Book-Flip Wedding Story Invitation.
 *
 * 5-spread (10-page) design with 3D CSS page flips,
 * ScatterText animations, and CSS-only confetti burst.
 *
 * Navigation: arrows/Home/End keys, swipe, dot indicators.
 */
export function WeddingStorybook({
  data,
  theme = "midnight",
  initialState,
  showHint = true,
  className,
}: WeddingStorybookProps) {
  const storybookData = mapToStorybook(data);
  const themeTokens = getStorybookThemeTokens(theme);

  const initialSpread = initialState === "open" ? 1 : 0;
  const [currentSpread, setCurrentSpread] = useState(initialSpread);
  /**
   * Lagged copy of currentSpread used only for the nav-arrow surface color.
   * The flip animation lasts ~1.1s; the page is edge-on (90°) at the midpoint,
   * which is when the new surface starts appearing. Swapping the arrow color
   * at that moment makes it feel like it belongs to the surface beneath
   * rather than snapping at click time.
   */
  const [navSurfaceSpread, setNavSurfaceSpread] = useState(initialSpread);
  const [confettiActive, setConfettiActive] = useState(false);
  const confettiFired = useRef(false);
  const touchStartX = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);
  const [spreadAnnouncement, setSpreadAnnouncement] = useState("");

  // Fire confetti once when reaching the final (RSVP) spread
  useEffect(() => {
    if (currentSpread === TOTAL_SPREADS - 1 && !confettiFired.current) {
      confettiFired.current = true;
      const timer = setTimeout(() => setConfettiActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, [currentSpread]);

  // Sync the lagged nav-surface spread to currentSpread, timed to the flip
  // midpoint (≈ flip-duration/2 + initial 0.08s start delay). The button's
  // existing 0.25s transition then crossfades color/border across the moment
  // the new surface emerges.
  useEffect(() => {
    const id = window.setTimeout(() => setNavSurfaceSpread(currentSpread), 600);
    return () => window.clearTimeout(id);
  }, [currentSpread]);

  const goNext = useCallback(() => {
    setCurrentSpread((s) => {
      const next = Math.min(s + 1, TOTAL_SPREADS - 1);
      if (next !== s) setSpreadAnnouncement(`Page ${next + 1} of ${TOTAL_SPREADS}`);
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSpread((s) => {
      const prev = Math.max(s - 1, 0);
      if (prev !== s) setSpreadAnnouncement(`Page ${prev + 1} of ${TOTAL_SPREADS}`);
      return prev;
    });
  }, []);

  const goTo = useCallback((spread: number) => {
    const clamped = Math.max(0, Math.min(spread, TOTAL_SPREADS - 1));
    setCurrentSpread(clamped);
    setSpreadAnnouncement(`Page ${clamped + 1} of ${TOTAL_SPREADS}`);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(TOTAL_SPREADS - 1);
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, goTo]);

  // Touch / swipe navigation
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60) goPrev();
    if (delta < -60) goNext();
  }

  /**
   * Page configuration: defines every page's variant and content.
   */
  const pages: {
    variant: PageVariant;
    content: React.ReactNode;
  }[] = [
    // Spread 0: Cover
    { variant: "dark", content: <CoverLeft data={storybookData} active={currentSpread === 0} /> },
    { variant: "dark", content: <CoverRight data={storybookData} active={currentSpread === 0} /> },
    // Spread 1: Our Story
    { variant: "dark", content: <StoryLeft data={storybookData} active={currentSpread === 1} /> },
    { variant: "light", content: <StoryRight data={storybookData} active={currentSpread === 1} /> },
    // Spread 2: Timeline
    { variant: "dark", content: <TimelineLeft data={storybookData} active={currentSpread === 2} /> },
    { variant: "light", content: <TimelineRight data={storybookData} active={currentSpread === 2} /> },
    // Spread 3: Details
    { variant: "dark", content: <DetailsLeft data={storybookData} active={currentSpread === 3} /> },
    { variant: "accent", content: <DetailsRight data={storybookData} active={currentSpread === 3} /> },
    // Spread 4: RSVP
    { variant: "dark", content: <RSVPLeft data={storybookData} active={currentSpread === 4} /> },
    { variant: "accent", content: <RSVPRight data={storybookData} active={currentSpread === 4} /> },
  ];

  const spreadCaptions: Record<SpreadLabel, string> = {
    cover: "",
    story: "Our Story",
    timeline: "The Journey",
    details: "Celebration",
    rsvp: "RSVP",
  };

  return (
    <div
      className={cn(
        styles.viewport,
        playfair.variable,
        cormorant.variable,
        pinyon.variable,
        className,
      )}
      style={themeTokens as unknown as React.CSSProperties}
    >
      {/* ARIA live region for spread changes */}
      <div className={styles.srOnly} aria-live="polite" role="status">
        {spreadAnnouncement}
      </div>

      <div
        ref={bookRef}
        className={styles.book}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`Wedding invitation storybook — spread ${currentSpread + 1} of ${TOTAL_SPREADS}`}
        aria-roledescription="storybook"
      >
        {/* Spine */}
        <div className={styles.spine} aria-hidden />

        {/* Navigation buttons. data-surface adapts color to the page beneath
            for contrast (gold on dark surfaces, ink on light/accent). */}
        <button
          className={cn(styles.navButton, styles.navPrev)}
          onClick={goPrev}
          disabled={currentSpread === 0}
          aria-label="Previous page"
          data-surface={pages[navSurfaceSpread * 2]?.variant ?? "dark"}
        >
          &lsaquo;
        </button>
        <button
          className={cn(styles.navButton, styles.navNext)}
          onClick={goNext}
          disabled={currentSpread === TOTAL_SPREADS - 1}
          aria-label="Next page"
          data-surface={pages[navSurfaceSpread * 2 + 1]?.variant ?? "dark"}
        >
          &rsaquo;
        </button>

        {/* Page panels */}
        {pages.map((page, index) => (
          <BookPage
            key={index}
            index={index}
            currentSpread={currentSpread}
            variant={page.variant}
          >
            {page.content}
          </BookPage>
        ))}

        {/* Spread label */}
        {currentSpread > 0 && (
          <div className={styles.spreadLabel}>
            {spreadCaptions[SPREAD_LABELS[currentSpread]]}
          </div>
        )}
      </div>

      {/* Spread indicator dots */}
      <div className={styles.indicator} role="tablist" aria-label="Page navigation">
        {SPREAD_LABELS.map((label, i) => (
          <button
            key={label}
            className={cn(styles.dot, i === currentSpread && styles.dotActive)}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === currentSpread}
            aria-label={`Go to ${label} spread`}
          />
        ))}
      </div>

      {/* Confetti burst on final spread */}
      <Confetti active={confettiActive} />

      {/* Keyboard hint */}
      {showHint && (
        <div className={styles.hint} aria-hidden>
          &larr; &rarr; to turn pages
        </div>
      )}
    </div>
  );
}
