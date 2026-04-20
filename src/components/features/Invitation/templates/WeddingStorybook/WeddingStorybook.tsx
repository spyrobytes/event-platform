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
import { TOTAL_SPREADS, TOTAL_PAGES, SPREAD_LABELS } from "./types";
import { useLayoutMode } from "./useLayoutMode";
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
 * Landscape / wide viewports — five 2-page spreads with 3D CSS page flips,
 * ScatterText animations, and a CSS-only confetti burst on the RSVP spread.
 *
 * Portrait / narrow viewports — single-page mode: pages turn with a
 * horizontal slide (no spine to flip around). Chapters stay as five;
 * dots jump to the first page of each chapter. See
 * internal-docs/wedding-storybook-portrait-mode-plan-v2.md.
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
  const layoutMode = useLayoutMode();

  // Canonical state is the page index (0..TOTAL_PAGES-1). Spread index is
  // derived. Spread-mode navigation snaps in steps of 2 (whole spreads);
  // single-mode navigation moves one page at a time. Dots always address
  // chapter boundaries (i * 2).
  const initialPage = initialState === "open" ? 2 : 0;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const currentSpread = Math.floor(currentPage / 2);

  /**
   * Lagged copy of currentSpread used only for the nav-arrow surface color
   * in spread mode. The flip animation lasts ~1.1s; the page is edge-on
   * (90°) at the midpoint, which is when the new surface appears. Swapping
   * the arrow color at that moment makes it feel like it belongs to the
   * surface beneath rather than snapping at click time. In single mode the
   * slide has no midpoint swap to time against — we read the active page
   * directly, no lag.
   */
  const [navSurfaceSpread, setNavSurfaceSpread] = useState(
    Math.floor(initialPage / 2),
  );
  const [confettiActive, setConfettiActive] = useState(false);
  const confettiFired = useRef(false);
  const touchStartX = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  // Fire confetti once on arrival at the RSVP chapter (in single mode, that
  // means reaching page 8 = RSVPLeft, which matches the spread-mode behaviour
  // where the whole RSVP spread animates in together).
  useEffect(() => {
    if (currentSpread === TOTAL_SPREADS - 1 && !confettiFired.current) {
      confettiFired.current = true;
      const timer = setTimeout(() => setConfettiActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, [currentSpread]);

  // Sync the lagged nav-surface spread to currentSpread, timed to the flip
  // midpoint (≈ flip-duration/2 + initial 0.08s start delay). The button's
  // existing 0.25s transition crossfades color/border across the moment the
  // new surface emerges. No-op effectively in single mode since the arrow
  // logic branches below.
  useEffect(() => {
    const id = window.setTimeout(() => setNavSurfaceSpread(currentSpread), 600);
    return () => window.clearTimeout(id);
  }, [currentSpread]);

  const announcePage = useCallback((page: number, mode: "spread" | "single") => {
    if (mode === "single") {
      setAnnouncement(`Page ${page + 1} of ${TOTAL_PAGES}`);
    } else {
      const spread = Math.floor(page / 2);
      setAnnouncement(`Chapter ${spread + 1} of ${TOTAL_SPREADS}`);
    }
  }, []);

  const goNext = useCallback(() => {
    setCurrentPage((p) => {
      const next = layoutMode === "single"
        ? Math.min(p + 1, TOTAL_PAGES - 1)
        : Math.min((Math.floor(p / 2) + 1) * 2, (TOTAL_SPREADS - 1) * 2);
      if (next !== p) announcePage(next, layoutMode);
      return next;
    });
  }, [layoutMode, announcePage]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => {
      const prev = layoutMode === "single"
        ? Math.max(p - 1, 0)
        : Math.max((Math.floor(p / 2) - 1) * 2, 0);
      if (prev !== p) announcePage(prev, layoutMode);
      return prev;
    });
  }, [layoutMode, announcePage]);

  // goTo takes a chapter index — same semantics in both modes (jump to the
  // chapter's first page). Dot taps route here.
  const goTo = useCallback((spread: number) => {
    const clamped = Math.max(0, Math.min(spread, TOTAL_SPREADS - 1));
    const page = clamped * 2;
    setCurrentPage(page);
    announcePage(page, layoutMode);
  }, [layoutMode, announcePage]);

  // Keyboard navigation. Home/End map to first/last meaningful page per mode:
  // single = absolute first/last page; spread = first/last chapter's left page.
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
          setCurrentPage(0);
          announcePage(0, layoutMode);
          break;
        case "End":
          e.preventDefault();
          {
            const last = layoutMode === "single"
              ? TOTAL_PAGES - 1
              : (TOTAL_SPREADS - 1) * 2;
            setCurrentPage(last);
            announcePage(last, layoutMode);
          }
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, layoutMode, announcePage]);

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

  const isSingle = layoutMode === "single";
  const prevDisabled = isSingle ? currentPage === 0 : currentSpread === 0;
  const nextDisabled = isSingle
    ? currentPage === TOTAL_PAGES - 1
    : currentSpread === TOTAL_SPREADS - 1;

  // In single mode, both arrows reflect the active page (no flip midpoint to
  // time the swap against). In spread mode, keep the lagged spread-indexed
  // lookup so arrow color crossfades with the flip.
  const prevSurface = isSingle
    ? pages[currentPage]?.variant
    : pages[navSurfaceSpread * 2]?.variant;
  const nextSurface = isSingle
    ? pages[currentPage]?.variant
    : pages[navSurfaceSpread * 2 + 1]?.variant;

  const bookAriaLabel = isSingle
    ? `Wedding invitation storybook — page ${currentPage + 1} of ${TOTAL_PAGES}`
    : `Wedding invitation storybook — spread ${currentSpread + 1} of ${TOTAL_SPREADS}`;

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
      {/* ARIA live region for page / chapter changes */}
      <div className={styles.srOnly} aria-live="polite" role="status">
        {announcement}
      </div>

      <div
        ref={bookRef}
        className={styles.book}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={bookAriaLabel}
        aria-roledescription="storybook"
      >
        {/* Spine — hidden via CSS in portrait mode */}
        <div className={styles.spine} aria-hidden />

        {/* Navigation buttons. data-surface adapts color to the page beneath
            for contrast (gold on dark surfaces, ink on light/accent). */}
        <button
          className={cn(styles.navButton, styles.navPrev)}
          onClick={goPrev}
          disabled={prevDisabled}
          aria-label="Previous page"
          data-surface={prevSurface ?? "dark"}
        >
          &lsaquo;
        </button>
        <button
          className={cn(styles.navButton, styles.navNext)}
          onClick={goNext}
          disabled={nextDisabled}
          aria-label="Next page"
          data-surface={nextSurface ?? "dark"}
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
            layoutMode={layoutMode}
            currentPage={currentPage}
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

      {/* Chapter indicator dots — always 5, one per chapter, both modes.
          Tap jumps to that chapter's first page. */}
      <div className={styles.indicator} role="tablist" aria-label="Chapter navigation">
        {SPREAD_LABELS.map((label, i) => (
          <button
            key={label}
            className={cn(styles.dot, i === currentSpread && styles.dotActive)}
            onClick={() => goTo(i)}
            role="tab"
            aria-selected={i === currentSpread}
            aria-label={
              isSingle
                ? `Chapter ${i + 1} of ${TOTAL_SPREADS}`
                : `Go to ${label} spread`
            }
          />
        ))}
      </div>

      {/* Confetti burst on arrival at the RSVP chapter (same timing both modes) */}
      <Confetti active={confettiActive} />

      {/* Keyboard hint — hidden on portrait via CSS */}
      {showHint && (
        <div className={styles.hint} aria-hidden>
          &larr; &rarr; to turn pages
        </div>
      )}
    </div>
  );
}
