"use client";

import { useMemo, Fragment } from "react";
import type { EventPageConfigV1, ChromeConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import {
  AnimationProvider,
  AnimatedWrapper,
  SectionNavProvider,
  SectionNav,
  TemporalProvider,
  TemporalHeroOverlay,
} from "../shared";
import type { TemporalData } from "../index";

// V2 chrome
import { Topbar, MountainDivider, FooterSkyline, ScrollProgress, Botanical } from "./chrome";

// V2 section renderers (all bespoke for cinematic aesthetic)
import {
  CinematicHero,
  TimelineStory,
  MasonryGallery,
  WeddingPartyV2,
  DetailsV2,
  TravelStayV2,
  RegistrySection,
  ScheduleV2,
  FAQV2,
  RSVPV2,
  AttireV2,
  ThingsToDoV2,
  SpeakersV2,
  SponsorsV2,
  MapV2,
} from "./sections";

// V2 tokens + footer + global styles
import { getV2CSSVariables, getV2FontUrl, v2TokensToInline, V2 } from "./tokens";
import { WeddingV2Footer } from "./WeddingV2Footer";
import "./WeddingTemplateV2.module.css";

import { getSectionLabel as baseGetSectionLabel } from "@/lib/guest-access";

type WeddingTemplateV2Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  temporal?: TemporalData;
};

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
 * Wedding Template V2 — Cinematic
 *
 * Premium bespoke wedding template with:
 * - Cinematic full-viewport hero with floating countdown/schedule cards
 * - Scroll-drawn SVG timeline story section
 * - Multi-mode gallery (masonry/grid) with lightbox
 * - All sections styled with V2 cinematic aesthetic
 * - Stroke-only mountain-range dividers between sections
 * - Fixed topbar with monogram, nav, RSVP, frosted glass on scroll
 * - Gradient scroll progress bar
 * - Full footer with monogram, nav, credits
 * - User-configurable accent color, font pair, and chrome toggles
 */
export function WeddingTemplateV2({ config, assets, eventId, temporal }: WeddingTemplateV2Props) {
  const { theme, hero, sections, chrome: chromeConfig } = config;

  // Resolve chrome settings with defaults for V2
  const chrome: ChromeConfig = {
    topbar: chromeConfig?.topbar ?? true,
    scrollProgress: chromeConfig?.scrollProgress ?? true,
    mountainDividers: chromeConfig?.mountainDividers ?? true,
    footerSkyline: chromeConfig?.footerSkyline ?? true,
    botanicals: chromeConfig?.botanicals ?? true,
  };

  // V2 token system: user's primaryColor → --accent, fontPair → font families
  const primaryColor = theme.primaryColor;
  const cssVars = getV2CSSVariables(primaryColor, theme.fontPair);
  const fontUrl = getV2FontUrl(theme.fontPair);

  // Find hero asset
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Build schedule cards from actual schedule section data for the hero float card
  const scheduleCards = useMemo(() => {
    const scheduleSec = sections.find((s) => s.type === "schedule");
    if (!scheduleSec || scheduleSec.type !== "schedule") return undefined;

    // Prefer groups (multi-day): show first item from each group
    const groups = scheduleSec.data.groups;
    if (groups && groups.length > 0) {
      const cards: { day: string; info: string }[] = [];
      for (const group of groups.slice(0, 4)) {
        const firstItem = group.items[0];
        cards.push({
          day: group.date || group.label,
          info: firstItem ? firstItem.title : group.label,
        });
      }
      return cards.length > 0 ? cards : undefined;
    }

    // Fallback: flat items
    const items = scheduleSec.data.items;
    if (!items || items.length === 0) return undefined;
    return items.slice(0, 4).map((item) => ({
      day: item.time,
      info: item.title,
    }));
  }, [sections]);

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

  let sectionIndex = 0;

  const renderSection = (section: (typeof sections)[number], arrayIndex: number) => {
    if (!section.enabled) return null;

    const key = `${section.type}-${arrayIndex}`;
    const currentSectionIndex = sectionIndex++;
    const sectionLabel = getSectionLabel(section.type);

    const wrapWithAnimation = (content: React.ReactNode) => (
      <AnimatedWrapper
        sectionIndex={currentSectionIndex}
        navId={section.type}
        navLabel={sectionLabel}
      >
        {content}
      </AnimatedWrapper>
    );

    // Botanical accent placement (matches POC)
    const BOTANICAL_PLACEMENTS: Record<string, React.ReactNode> = {
      story: <Botanical variant="sage" style={{ top: 40, right: "5%", width: 120, height: 200, transform: "rotate(15deg)" }} />,
      gallery: <Botanical variant="gold" style={{ top: 20, left: "3%", width: 80, height: 140, transform: "rotate(-20deg) scaleX(-1)" }} />,
      details: <Botanical variant="sage" style={{ bottom: 60, left: "2%", width: 100, height: 160, transform: "rotate(-10deg)" }} />,
      travelStay: <Botanical variant="gold" style={{ top: 80, right: "3%", width: 90, height: 150, transform: "rotate(12deg)" }} />,
    };

    const botanical = chrome.botanicals ? (BOTANICAL_PLACEMENTS[section.type] ?? null) : null;

    const wrapWithChrome = (sectionElement: React.ReactNode) => (
      <Fragment key={key}>
        {chrome.mountainDividers && arrayIndex > 0 && (
          <MountainDivider flip={arrayIndex % 2 === 1} dividerIndex={arrayIndex} />
        )}
        {botanical ? (
          <div style={{ position: "relative", overflow: "hidden" }}>
            {botanical}
            {sectionElement}
          </div>
        ) : sectionElement}
      </Fragment>
    );

    switch (section.type) {
      case "details":
        return wrapWithChrome(wrapWithAnimation(
          <DetailsV2 data={section.data} />
        ));

      case "story":
        return wrapWithChrome(wrapWithAnimation(
          <TimelineStory data={section.data} assets={assets} />
        ));

      case "gallery":
        return wrapWithChrome(wrapWithAnimation(
          <MasonryGallery data={section.data} assets={assets} />
        ));

      case "weddingParty":
        return wrapWithChrome(wrapWithAnimation(
          <WeddingPartyV2 data={section.data} assets={assets} />
        ));

      case "travelStay":
        return wrapWithChrome(wrapWithAnimation(
          <TravelStayV2 data={section.data} />
        ));

      case "registry":
        return wrapWithChrome(wrapWithAnimation(
          <RegistrySection data={section.data} assets={assets} />
        ));

      case "schedule":
        return wrapWithChrome(wrapWithAnimation(
          <ScheduleV2 data={section.data} />
        ));

      case "faq":
        return wrapWithChrome(wrapWithAnimation(
          <FAQV2 data={section.data} />
        ));

      case "rsvp":
        return eventId ? wrapWithChrome(wrapWithAnimation(
          <RSVPV2 data={section.data} eventId={eventId} />
        )) : null;

      case "speakers":
        return wrapWithChrome(wrapWithAnimation(
          <SpeakersV2 data={section.data} assets={assets} />
        ));

      case "sponsors":
        return wrapWithChrome(wrapWithAnimation(
          <SponsorsV2 data={section.data} assets={assets} />
        ));

      case "map":
        return wrapWithChrome(wrapWithAnimation(
          <MapV2 data={section.data} />
        ));

      case "attire":
        return wrapWithChrome(wrapWithAnimation(
          <AttireV2 data={section.data} />
        ));

      case "thingsToDo":
        return wrapWithChrome(wrapWithAnimation(
          <ThingsToDoV2 data={section.data} />
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
          {/* Load Google Fonts for the selected font pair */}
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={fontUrl} />

          <article
            className="wedding-template-v2"
            style={{
              ...v2TokensToInline(cssVars),
              backgroundColor: V2.ivory,
              color: V2.charcoal,
              fontFamily: "var(--sans)",
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
              scheduleCards={scheduleCards}
              hasDetailsSection={sections.some((s) => s.type === "details" && s.enabled)}
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

          {/* Global V2 styles loaded via WeddingTemplateV2.module.css */}
        </AnimationProvider>
      </SectionNavProvider>
    </TemporalProvider>
  );
}
