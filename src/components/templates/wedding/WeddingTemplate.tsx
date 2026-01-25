"use client";

import { useMemo, Fragment } from "react";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { getWeddingVariant, DEFAULT_VARIANT_ID } from "./variants";
import { resolveStyles, stylesToInline } from "./tokens";
import {
  AnimationProvider,
  AnimatedWrapper,
  SectionNavProvider,
  SectionNav,
  ChapterBreak,
  WEDDING_CHAPTERS,
  assignChaptersToSections,
  findChapterForSection,
  TemporalProvider,
  TemporalHeroOverlay,
} from "../shared";
import type { TemporalData } from "../index";

// Existing shared sections
import {
  HeroSection,
  DetailsSection,
  ScheduleSection,
  FAQSection,
  GallerySection,
  RSVPSection,
  SpeakersSection,
  SponsorsSection,
  MapSection,
} from "../WeddingTemplateV1/sections";

// New wedding-specific sections
import {
  StorySection,
  TravelStaySection,
  WeddingPartySection,
  AttireSection,
  ThingsToDoSection,
} from "./sections";

type WeddingTemplateProps = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  /** Temporal data for time-aware rendering */
  temporal?: TemporalData;
};

/**
 * Get human-readable label for section type
 */
function getSectionLabel(type: string): string {
  const labels: Record<string, string> = {
    details: "Details",
    schedule: "Schedule",
    faq: "FAQ",
    gallery: "Gallery",
    rsvp: "RSVP",
    speakers: "Speakers",
    sponsors: "Sponsors",
    map: "Location",
    story: "Our Story",
    travelStay: "Travel & Stay",
    weddingParty: "Wedding Party",
    attire: "Attire",
    thingsToDo: "Things to Do",
  };
  return labels[type] || type;
}

/**
 * Variant-Aware Wedding Template
 *
 * This template renders wedding pages based on the selected variant.
 * It uses configuration-driven styling and section ordering.
 *
 * Features:
 * - Scroll-triggered section animations (respects variant.animations setting)
 * - Staggered section reveals for polished appearance
 * - Reduced motion preference support
 *
 * Variants: classic, modern_minimal, rustic_outdoor, destination, intimate_micro
 */
export function WeddingTemplate({ config, assets, eventId, temporal }: WeddingTemplateProps) {
  const { theme, hero, sections, variantId } = config;

  // Get variant configuration
  const variant = getWeddingVariant(variantId || DEFAULT_VARIANT_ID);

  // Resolve style tokens for this variant
  const styles = resolveStyles(variant.styleTokens);

  // Find hero asset
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Use variant's accent color as primary, or fall back to theme.primaryColor
  const primaryColor = variant.styleTokens.accentColor || theme.primaryColor;

  // Assign chapters to sections
  const chapteredSections = useMemo(
    () => assignChaptersToSections(sections, WEDDING_CHAPTERS),
    [sections]
  );

  // Count unique chapters for progress display
  const totalChapters = useMemo(() => {
    const chapterIds = new Set(chapteredSections.map((s) => s.chapterId));
    return chapterIds.size;
  }, [chapteredSections]);

  // Track section index for stagger animation
  let sectionIndex = 0;
  let chapterNumber = 0;
  let lastChapterId: string | null = null;

  // Render a section by type with animation wrapper
  const renderSection = (section: (typeof sections)[number], arrayIndex: number) => {
    if (!section.enabled) return null;

    const key = `${section.type}-${arrayIndex}`;
    const currentSectionIndex = sectionIndex++;
    const sectionLabel = getSectionLabel(section.type);

    // Find chapter info for this section
    const chapteredSection = chapteredSections.find(
      (cs) => cs.originalIndex === arrayIndex
    );
    const isChapterStart = chapteredSection?.isChapterStart ?? false;
    const chapterId = chapteredSection?.chapterId ?? null;

    // Determine if we should show a chapter break
    let chapterBreakElement: React.ReactNode = null;
    if (isChapterStart && chapterId !== lastChapterId) {
      // Don't show chapter break for the very first section (after hero)
      if (lastChapterId !== null) {
        chapterNumber++;
        const chapter = findChapterForSection(section.type, WEDDING_CHAPTERS);
        chapterBreakElement = (
          <ChapterBreak
            key={`chapter-${chapterId}`}
            chapter={chapter}
            chapterNumber={chapterNumber}
            totalChapters={totalChapters}
            showNumber={false}
            accentColor={primaryColor}
          />
        );
      }
      lastChapterId = chapterId;
    }

    // Common wrapper for animation and section nav registration
    const wrapWithAnimation = (content: React.ReactNode) => (
      <AnimatedWrapper
        sectionIndex={currentSectionIndex}
        navId={section.type}
        navLabel={sectionLabel}
        navChapterId={chapterId ?? undefined}
      >
        {content}
      </AnimatedWrapper>
    );

    // Helper to wrap section with optional chapter break
    const wrapWithChapter = (sectionElement: React.ReactNode) => (
      <Fragment key={key}>
        {chapterBreakElement}
        {sectionElement}
      </Fragment>
    );

    switch (section.type) {
      case "details":
        return wrapWithChapter(wrapWithAnimation(
          <DetailsSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      case "schedule":
        return wrapWithChapter(wrapWithAnimation(
          <ScheduleSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      case "faq":
        return wrapWithChapter(wrapWithAnimation(
          <FAQSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      case "gallery":
        return wrapWithChapter(wrapWithAnimation(
          <GallerySection
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        ));

      case "rsvp":
        return eventId ? wrapWithChapter(wrapWithAnimation(
          <RSVPSection
            data={section.data}
            eventId={eventId}
            primaryColor={primaryColor}
          />
        )) : null;

      case "speakers":
        return wrapWithChapter(wrapWithAnimation(
          <SpeakersSection
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        ));

      case "sponsors":
        return wrapWithChapter(wrapWithAnimation(
          <SponsorsSection
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        ));

      case "map":
        return wrapWithChapter(wrapWithAnimation(
          <MapSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      // New wedding-specific sections
      case "story":
        return wrapWithChapter(wrapWithAnimation(
          <StorySection
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        ));

      case "travelStay":
        return wrapWithChapter(wrapWithAnimation(
          <TravelStaySection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      case "weddingParty":
        return wrapWithChapter(wrapWithAnimation(
          <WeddingPartySection
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        ));

      case "attire":
        return wrapWithChapter(wrapWithAnimation(
          <AttireSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      case "thingsToDo":
        return wrapWithChapter(wrapWithAnimation(
          <ThingsToDoSection
            data={section.data}
            primaryColor={primaryColor}
          />
        ));

      default:
        return null;
    }
  };

  return (
    <TemporalProvider
      startAt={temporal?.startAt}
      endAt={temporal?.endAt}
      timezone={temporal?.timezone}
    >
      <SectionNavProvider>
        <AnimationProvider
          animationLevel={variant.animations}
          staggerDelay={75}
          enableStagger={true}
        >
          <article
            className="wedding-template min-h-screen"
            style={{
              ...stylesToInline(styles.cssVariables),
              backgroundColor: styles.colors.background,
              color: styles.colors.text,
            }}
            data-variant={variant.id}
          >
            {/* Hero Section - Always rendered, no animation wrapper */}
            <HeroSection
              config={hero}
              heroAsset={heroAsset}
              primaryColor={primaryColor}
            />

            {/* Temporal Hero Overlay - Shows countdown, live indicator, or post-event message */}
            <TemporalHeroOverlay accentColor={primaryColor} />

            {/* Dynamic Sections with staggered animations */}
            {sections.map((section, index) => renderSection(section, index))}

            {/* Footer */}
            <footer
              className="border-t py-8 text-center text-sm"
              style={{
                borderColor: styles.colors.border,
                color: styles.colors.textMuted,
              }}
            >
              <p>Powered by EventFXr</p>
            </footer>
          </article>

          {/* Floating Section Navigation */}
          <SectionNav accentColor={primaryColor} />
        </AnimationProvider>
      </SectionNavProvider>
    </TemporalProvider>
  );
}
