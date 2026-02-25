"use client";

import { useMemo, Fragment } from "react";
import type { EventPageConfigV1, ChromeConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
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

// V2 chrome
import { Topbar, MountainDivider, FooterSkyline, ScrollProgress } from "./chrome";

// V2-specific section renderers
import {
  CinematicHero,
  TimelineStory,
  MasonryGallery,
  WeddingPartyV2,
  DetailsV2,
  TravelStayV2,
  RegistrySection,
} from "./sections";

// Reused V1 sections
import {
  ScheduleSection,
  FAQSection,
  RSVPSection,
  SpeakersSection,
  SponsorsSection,
  MapSection,
} from "../WeddingTemplateV1/sections";

// Reused wedding-specific V1 sections
import {
  AttireSection,
  ThingsToDoSection,
} from "../wedding/sections";

// V2 tokens
import { getV2CSSVariables, v2TokensToInline, WEDDING_V2_PALETTE } from "./tokens";

type WeddingTemplateV2Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  temporal?: TemporalData;
};

/** Human-readable section labels for nav */
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
    registry: "Registry",
  };
  return labels[type] || type;
}

/**
 * Wedding Template V2 — Cinematic
 *
 * Features:
 * - Cinematic full-viewport hero with floating countdown/schedule cards
 * - Scroll-drawn SVG timeline story section
 * - Asymmetric masonry gallery
 * - Mountain-range dividers between sections
 * - Fixed topbar with monogram and scroll progress
 * - Footer skyline SVG
 */
export function WeddingTemplateV2({ config, assets, eventId, temporal }: WeddingTemplateV2Props) {
  const { theme, hero, sections, chrome: chromeConfig } = config;

  // Resolve chrome settings with defaults for V2
  const chrome: ChromeConfig = {
    topbar: chromeConfig?.topbar ?? true,
    scrollProgress: chromeConfig?.scrollProgress ?? true,
    mountainDividers: chromeConfig?.mountainDividers ?? true,
    footerSkyline: chromeConfig?.footerSkyline ?? true,
  };

  // V2 uses its own default palette; user's primaryColor overrides accent
  const primaryColor = theme.primaryColor;
  const cssVars = getV2CSSVariables(primaryColor);

  // Find hero asset
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Assign chapters
  const chapteredSections = useMemo(
    () => assignChaptersToSections(sections, WEDDING_CHAPTERS),
    [sections]
  );

  const totalChapters = useMemo(() => {
    const chapterIds = new Set(chapteredSections.map((s) => s.chapterId));
    return chapterIds.size;
  }, [chapteredSections]);

  let sectionIndex = 0;
  let chapterNumber = 0;
  let lastChapterId: string | null = null;

  const renderSection = (section: (typeof sections)[number], arrayIndex: number) => {
    if (!section.enabled) return null;

    const key = `${section.type}-${arrayIndex}`;
    const currentSectionIndex = sectionIndex++;
    const sectionLabel = getSectionLabel(section.type);

    // Chapter break logic
    const chapteredSection = chapteredSections.find(
      (cs) => cs.originalIndex === arrayIndex
    );
    const isChapterStart = chapteredSection?.isChapterStart ?? false;
    const chapterId = chapteredSection?.chapterId ?? null;

    let chapterBreakElement: React.ReactNode = null;
    if (isChapterStart && chapterId !== lastChapterId) {
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

    const wrapWithChrome = (sectionElement: React.ReactNode) => (
      <Fragment key={key}>
        {chapterBreakElement}
        {chrome.mountainDividers && arrayIndex > 0 && (
          <MountainDivider
            flip={arrayIndex % 2 === 1}
            color={`${primaryColor}15`}
          />
        )}
        {sectionElement}
      </Fragment>
    );

    switch (section.type) {
      // V2-specific renderers
      case "details":
        return wrapWithChrome(wrapWithAnimation(
          <DetailsV2 data={section.data} primaryColor={primaryColor} />
        ));

      case "story":
        return wrapWithChrome(wrapWithAnimation(
          section.data.layout === "timeline" ? (
            <TimelineStory data={section.data} assets={assets} primaryColor={primaryColor} />
          ) : (
            // Import v1 StorySection for non-timeline layouts
            <TimelineStory data={section.data} assets={assets} primaryColor={primaryColor} />
          )
        ));

      case "gallery":
        return wrapWithChrome(wrapWithAnimation(
          <MasonryGallery data={section.data} assets={assets} primaryColor={primaryColor} />
        ));

      case "weddingParty":
        return wrapWithChrome(wrapWithAnimation(
          <WeddingPartyV2 data={section.data} assets={assets} primaryColor={primaryColor} />
        ));

      case "travelStay":
        return wrapWithChrome(wrapWithAnimation(
          <TravelStayV2 data={section.data} primaryColor={primaryColor} />
        ));

      case "registry":
        return wrapWithChrome(wrapWithAnimation(
          <RegistrySection data={section.data} assets={assets} primaryColor={primaryColor} />
        ));

      // Reused V1 renderers
      case "schedule":
        return wrapWithChrome(wrapWithAnimation(
          <ScheduleSection data={section.data} primaryColor={primaryColor} />
        ));

      case "faq":
        return wrapWithChrome(wrapWithAnimation(
          <FAQSection data={section.data} primaryColor={primaryColor} />
        ));

      case "rsvp":
        return eventId ? wrapWithChrome(wrapWithAnimation(
          <RSVPSection data={section.data} eventId={eventId} primaryColor={primaryColor} />
        )) : null;

      case "speakers":
        return wrapWithChrome(wrapWithAnimation(
          <SpeakersSection data={section.data} assets={assets} primaryColor={primaryColor} />
        ));

      case "sponsors":
        return wrapWithChrome(wrapWithAnimation(
          <SponsorsSection data={section.data} assets={assets} primaryColor={primaryColor} />
        ));

      case "map":
        return wrapWithChrome(wrapWithAnimation(
          <MapSection data={section.data} primaryColor={primaryColor} />
        ));

      case "attire":
        return wrapWithChrome(wrapWithAnimation(
          <AttireSection data={section.data} primaryColor={primaryColor} />
        ));

      case "thingsToDo":
        return wrapWithChrome(wrapWithAnimation(
          <ThingsToDoSection data={section.data} primaryColor={primaryColor} />
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
          animationLevel="moderate"
          staggerDelay={75}
          enableStagger={true}
        >
          <article
            className="wedding-template-v2 min-h-screen"
            style={{
              ...v2TokensToInline(cssVars),
              backgroundColor: WEDDING_V2_PALETTE.ivory,
              color: WEDDING_V2_PALETTE.text,
            }}
            data-template="wedding-v2"
          >
            {/* Chrome: Topbar */}
            {chrome.topbar && (
              <Topbar
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                accentColor={primaryColor}
              />
            )}

            {/* Chrome: Scroll Progress */}
            {chrome.scrollProgress && (
              <ScrollProgress accentColor={primaryColor} />
            )}

            {/* Hero Section */}
            <CinematicHero
              config={hero}
              heroAsset={heroAsset}
              primaryColor={primaryColor}
            />

            {/* Temporal Hero Overlay */}
            <TemporalHeroOverlay accentColor={primaryColor} />

            {/* Dynamic Sections */}
            {sections.map((section, index) => renderSection(section, index))}

            {/* Chrome: Footer Skyline */}
            {chrome.footerSkyline && (
              <FooterSkyline color={primaryColor} />
            )}

            {/* Footer */}
            <footer
              className="border-t py-8 text-center text-sm"
              style={{
                borderColor: WEDDING_V2_PALETTE.border,
                color: WEDDING_V2_PALETTE.textMuted,
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
