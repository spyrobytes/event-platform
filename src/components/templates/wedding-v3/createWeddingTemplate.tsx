"use client";

import { useMemo, Fragment } from "react";
import type { TemplateProps } from "../index";
import type { TemplateDefinition } from "./types";
import type { MotionPresetConfig } from "../shared";

import {
  AnimationProvider,
  AnimatedWrapper,
  SectionNavProvider,
  SectionNav,
  TemporalProvider,
  TemporalHeroOverlay,
} from "../shared";

import {
  getV3CSSVariables,
  getV3GlassVariables,
  getV3FontUrl,
  tokensToInline,
} from "./theme-packs";

import {
  getHeroRenderer,
  getNavRenderer,
  getGalleryRenderer,
  getScheduleRenderer,
  getStoryRenderer,
  getRSVPRenderer,
  getFooterRenderer,
  getDividerRenderer,
  getWeddingPartyRenderer,
  detailsRenderer as DetailsRenderer,
  faqRenderer as FAQRenderer,
  travelStayRenderer as TravelStayRenderer,
  registryRenderer as RegistryRenderer,
  wishesRenderer as WishesRenderer,
  PaperFilters,
  attireRenderer as AttireRenderer,
  thingsToDoRenderer as ThingsToDoRenderer,
  speakersRenderer as SpeakersRenderer,
  sponsorsRenderer as SponsorsRenderer,
  mapRenderer as MapRenderer,
} from "./renderers";

// Chrome components (reuse V2 for scroll progress + footer skyline until replaced)
import { ScrollProgress } from "../wedding-v2/chrome/ScrollProgress";
import { FooterSkyline } from "../wedding-v2/chrome/FooterSkyline";

// Shared utilities
import { getSectionLabel as baseGetSectionLabel } from "@/lib/guest-access";

// V2 global styles (shared across V3 templates until each gets its own)
import "../wedding-v2/WeddingTemplateV2.module.css";

// ---------------------------------------------------------------------------
// Label + ID helpers
// ---------------------------------------------------------------------------

const LABEL_OVERRIDES: Record<string, string> = {
  travelStay: "Travel",
  registry: "Registry",
};

function getSectionLabel(type: string): string {
  return LABEL_OVERRIDES[type] || baseGetSectionLabel(type);
}

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a wedding template component from a TemplateDefinition.
 *
 * The returned component is a fully self-contained template that:
 * - Sets up all required providers (Animation, SectionNav, Temporal)
 * - Generates CSS variables from the definition's ThemePack
 * - Dispatches section rendering to the definition's chosen renderers
 * - Renders the definition's chosen nav, hero, footer, and dividers
 */
export function createWeddingTemplate(definition: TemplateDefinition) {
  // Resolve renderers at definition time (not per-render)
  const HeroComponent = getHeroRenderer(definition.heroRenderer);
  const NavComponent = getNavRenderer(definition.navRenderer);
  const FooterComponent = getFooterRenderer(definition.footerRenderer);
  const DividerComponent = getDividerRenderer(definition.dividerRenderer);
  const GalleryComponent = getGalleryRenderer(definition.galleryRenderer);
  const ScheduleComponent = getScheduleRenderer(definition.scheduleRenderer);
  const StoryComponent = getStoryRenderer(definition.storyRenderer);
  const RSVPComponent = getRSVPRenderer(definition.rsvpRenderer);
  const WeddingPartyComponent = getWeddingPartyRenderer(definition.weddingPartyRenderer);

  // Convert MotionPreset to AnimationProvider's MotionPresetConfig
  const motionConfig: MotionPresetConfig = {
    revealType: definition.motionPreset.revealType,
    duration: definition.motionPreset.duration,
    easing: definition.motionPreset.easing,
    staggerDelay: definition.motionPreset.staggerDelay,
    parallax: definition.motionPreset.parallax,
  };

  // Default theme pack is the first one
  const defaultThemePack = definition.themePacks[0];

  function WeddingTemplate({
    config,
    assets,
    eventId,
    eventSlug,
    temporal,
    registryClaims,
    canClaim,
    registryMode = "full",
    approvedWishes,
    wishesMode = "full",
    inviteToken,
    navLinkBase,
    subPageSection,
  }: TemplateProps) {
    const { theme, hero, sections } = config;
    const primaryColor = theme.primaryColor;
    const socialLinks = definition.supportsSocialLinks ? config.socialLinks : undefined;

    // Generate tokens from the definition's theme pack
    const cssVars = getV3CSSVariables(defaultThemePack, primaryColor, definition.motionPreset);
    const glassVars = getV3GlassVariables(defaultThemePack);
    const fontUrl = getV3FontUrl(defaultThemePack);

    // Find hero asset
    const heroAsset = hero.heroImageAssetId
      ? assets.find((a) => a.id === hero.heroImageAssetId)
      : null;

    // Find couple photo asset (optional portrait)
    const couplePhotoAsset = hero.couplePhotoAssetId
      ? assets.find((a) => a.id === hero.couplePhotoAssetId)
      : null;

    // Build schedule cards for hero
    const scheduleCards = useMemo(() => {
      const scheduleSec = sections.find((s) => s.type === "schedule");
      if (!scheduleSec || scheduleSec.type !== "schedule") return undefined;

      const groups = scheduleSec.data.groups;
      if (groups && groups.length > 0) {
        const cards: { day: string; info: string }[] = [];
        for (const group of groups) {
          const dayLabel = group.date || group.label;
          if (group.items.length === 0) {
            cards.push({ day: dayLabel, info: group.label });
          } else {
            for (const item of group.items) {
              cards.push({ day: dayLabel, info: item.title });
            }
          }
        }
        return cards.length > 0 ? cards.slice(0, 6) : undefined;
      }

      const items = scheduleSec.data.items;
      if (!items || items.length === 0) return undefined;
      return items.slice(0, 4).map((item) => ({
        day: item.time,
        info: item.title,
      }));
    }, [sections]);

    const navSections = useMemo(() => {
      return sections
        .filter((s) => s.enabled)
        .map((s) => {
          const id = getSectionId(s.type);
          const label = getSectionLabel(s.type);
          const isOnPage = !navLinkBase || s.type === subPageSection;
          const href = isOnPage ? `#${id}` : `${navLinkBase}#${id}`;
          return { id, label, href };
        });
    }, [sections, navLinkBase, subPageSection]);

    const dateText = hero.subtitle || "";

    let sectionIndex = 0;

    const renderSection = (section: (typeof sections)[number], arrayIndex: number) => {
      if (!section.enabled) return null;
      if (navLinkBase && section.type !== subPageSection) return null;

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

      // Divider before each section (except the first)
      const divider = definition.dividerRenderer !== "none" && arrayIndex > 0 ? (
        <DividerComponent flip={arrayIndex % 2 === 1} dividerIndex={arrayIndex} />
      ) : null;

      const wrapWithChrome = (sectionElement: React.ReactNode) => (
        <Fragment key={key}>
          {divider}
          {sectionElement}
        </Fragment>
      );

      switch (section.type) {
        case "details":
          return wrapWithChrome(wrapWithAnimation(
            <DetailsRenderer data={section.data} assets={assets} />
          ));
        case "story":
          return wrapWithChrome(wrapWithAnimation(
            <StoryComponent data={section.data} assets={assets} />
          ));
        case "gallery":
          return wrapWithChrome(wrapWithAnimation(
            <GalleryComponent data={section.data} assets={assets} />
          ));
        case "weddingParty":
          return wrapWithChrome(wrapWithAnimation(
            <WeddingPartyComponent data={section.data} assets={assets} />
          ));
        case "travelStay":
          return wrapWithChrome(wrapWithAnimation(
            <TravelStayRenderer data={section.data} assets={assets} />
          ));
        case "registry":
          return wrapWithChrome(wrapWithAnimation(
            <RegistryRenderer
              data={section.data}
              assets={assets}
              eventId={eventId}
              eventSlug={eventSlug}
              registryClaims={registryClaims}
              canClaim={canClaim}
              registryMode={registryMode}
            />
          ));
        case "wishes":
          return wrapWithChrome(wrapWithAnimation(
            <WishesRenderer
              data={section.data}
              assets={assets}
              eventId={eventId}
              eventSlug={eventSlug}
              approvedWishes={approvedWishes}
              wishesMode={wishesMode}
              inviteToken={inviteToken}
            />
          ));
        case "schedule":
          return wrapWithChrome(wrapWithAnimation(
            <ScheduleComponent data={section.data} assets={assets} />
          ));
        case "faq":
          return wrapWithChrome(wrapWithAnimation(
            <FAQRenderer data={section.data} assets={assets} />
          ));
        case "rsvp":
          return eventId ? wrapWithChrome(wrapWithAnimation(
            <RSVPComponent data={section.data} eventId={eventId} />
          )) : null;
        case "speakers":
          return wrapWithChrome(wrapWithAnimation(
            <SpeakersRenderer data={section.data} assets={assets} />
          ));
        case "sponsors":
          return wrapWithChrome(wrapWithAnimation(
            <SponsorsRenderer data={section.data} assets={assets} />
          ));
        case "map":
          return wrapWithChrome(wrapWithAnimation(
            <MapRenderer data={section.data} assets={assets} />
          ));
        case "attire":
          return wrapWithChrome(wrapWithAnimation(
            <AttireRenderer data={section.data} assets={assets} />
          ));
        case "thingsToDo":
          return wrapWithChrome(wrapWithAnimation(
            <ThingsToDoRenderer data={section.data} assets={assets} />
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
            staggerDelay={definition.motionPreset.staggerDelay}
            enableStagger={true}
            motionPreset={motionConfig}
          >
            <link rel="stylesheet" href={fontUrl} />

            <article
              className="wedding-template-v2"
              style={{
                ...tokensToInline({ ...cssVars, ...glassVars }),
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                fontFamily: "var(--sans)",
                fontSize: "var(--body)",
                lineHeight: 1.7,
                minHeight: "100vh",
                overflowX: "hidden",
              }}
              data-template={`wedding-v3-${definition.id}`}
            >
              {/* SVG defs for the Wedding Wishes ripped-paper effect.
                  Cheap when no wishes section exists; mounted unconditionally
                  so per-card filter URLs always resolve. */}
              {sections.some((s) => s.type === "wishes" && s.enabled) && (
                <PaperFilters />
              )}

              {/* Nav */}
              <NavComponent
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={navSections}
                accentColor={primaryColor}
                hasHeroImage={!!heroAsset?.publicUrl}
                homeHref={navLinkBase ? `${navLinkBase}#top` : undefined}
              />

              {/* Chrome: Scroll Progress */}
              {definition.chromeKit.scrollProgress && (
                <ScrollProgress
                  accentColor={primaryColor}
                  gradient={definition.scrollProgressGradient}
                />
              )}

              {/* Hero */}
              <HeroComponent
                config={hero}
                heroAsset={heroAsset}
                couplePhotoAsset={couplePhotoAsset}
                scheduleCards={scheduleCards}
                hasDetailsSection={sections.some((s) => s.type === "details" && s.enabled)}
                eventRsvpDeadline={temporal?.rsvpDeadline ?? undefined}
              />

              {/* Temporal Hero Overlay */}
              <TemporalHeroOverlay accentColor={primaryColor} />

              {/* Dynamic Sections */}
              {sections.map((section, index) => renderSection(section, index))}

              {/* Chrome: Footer Decoration */}
              {definition.chromeKit.footerDecoration && (
                <FooterSkyline color={primaryColor} />
              )}

              {/* Footer */}
              <FooterComponent
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={navSections}
                socialLinks={socialLinks}
              />
            </article>

            {/* Floating Section Navigation */}
            <SectionNav accentColor={primaryColor} />
          </AnimationProvider>
        </SectionNavProvider>
      </TemporalProvider>
    );
  }

  // Set display name for React DevTools
  WeddingTemplate.displayName = `WeddingTemplate(${definition.id})`;

  return WeddingTemplate;
}
