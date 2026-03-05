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

// V2 tokens + footer
import { getV2CSSVariables, v2TokensToInline, V2 } from "./tokens";
import { WeddingV2Footer } from "./WeddingV2Footer";

type WeddingTemplateV2Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  temporal?: TemporalData;
};

import { getSectionLabel as baseGetSectionLabel } from "@/lib/guest-access";

const V2_LABEL_OVERRIDES: Record<string, string> = {
  travelStay: "Travel",
  registry: "Registry",
};

function getSectionLabel(type: string): string {
  return V2_LABEL_OVERRIDES[type] || baseGetSectionLabel(type);
}

/** Map section type to anchor ID */
function getSectionId(type: string): string {
  const ids: Record<string, string> = {
    story: "story",
    gallery: "gallery",
    weddingParty: "party",
    details: "details",
    registry: "registry",
    travelStay: "travel",
    rsvp: "rsvp",
    faq: "faq",
    schedule: "schedule",
    attire: "attire",
    thingsToDo: "things",
    speakers: "speakers",
    sponsors: "sponsors",
    map: "map",
  };
  return ids[type] || type;
}

/**
 * Wedding Template V2 — Cinematic (POC Parity)
 *
 * Features:
 * - Cinematic full-viewport hero with floating countdown/schedule cards
 * - Scroll-drawn SVG timeline story section
 * - 12-column asymmetric gallery with lightbox
 * - Stroke-only mountain-range dividers between sections
 * - Fixed topbar with monogram, nav, RSVP, frosted glass on scroll
 * - Gradient scroll progress bar
 * - Full footer with monogram, nav, credits
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

  // Build nav sections from enabled sections
  const navSections = useMemo(() => {
    return sections
      .filter((s) => s.enabled)
      .map((s) => ({
        id: getSectionId(s.type),
        label: getSectionLabel(s.type),
      }));
  }, [sections]);

  // Date text for topbar/footer
  const dateText = hero.subtitle || "";

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
          <MountainDivider flip={arrayIndex % 2 === 1} />
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
          <TimelineStory data={section.data} assets={assets} primaryColor={primaryColor} />
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
            className="wedding-template-v2"
            style={{
              ...v2TokensToInline(cssVars),
              backgroundColor: V2.ivory,
              color: V2.charcoal,
              fontFamily: V2.sans,
              fontSize: "var(--body)",
              lineHeight: 1.7,
              minHeight: "100vh",
              overflowX: "hidden",
            }}
            data-template="wedding-v2"
          >
            {/* Chrome: Topbar */}
            {chrome.topbar && (
              <Topbar
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={navSections}
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
            <WeddingV2Footer
              monogram={hero.monogram}
              coupleNames={hero.coupleNames}
              dateText={dateText}
              sections={navSections}
            />
          </article>

          {/* Floating Section Navigation */}
          <SectionNav accentColor={primaryColor} />

          {/* Global typography styles for V2 */}
          <style>{`
            .wedding-template-v2 h1,
            .wedding-template-v2 h2,
            .wedding-template-v2 h3 {
              font-family: var(--serif);
              font-weight: 400;
              line-height: 1.15;
            }
            .wedding-template-v2 h1 {
              font-size: var(--h1);
              letter-spacing: -.02em;
              color: var(--night);
            }
            .wedding-template-v2 h2 {
              font-size: var(--h2);
              letter-spacing: -.015em;
              color: var(--night);
            }
            .wedding-template-v2 h3 {
              font-size: var(--h3);
              letter-spacing: -.01em;
              color: var(--charcoal);
            }
            .wedding-template-v2 img {
              display: block;
              max-width: 100%;
              height: auto;
            }
            .wedding-template-v2 a {
              color: inherit;
              text-decoration: none;
            }
          `}</style>
        </AnimationProvider>
      </SectionNavProvider>
    </TemporalProvider>
  );
}
