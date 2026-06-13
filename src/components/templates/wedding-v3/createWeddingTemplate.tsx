"use client";

import { useMemo, Fragment } from "react";
import {
  POST_EVENT_GALLERY_NAV_ID,
  POST_EVENT_GALLERY_NAV_LABEL,
} from "@/lib/gallery-urls";
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
  PreludeBlock,
} from "../shared";

import {
  getV3CSSVariables,
  getV3GlassVariables,
  getV3FontUrl,
  getSectionThemeVariables,
  tokensToInline,
} from "./theme-packs";
import { mostReadable, HEX6_RE } from "@/lib/color";
import { resolveWeddingPartyStyleId } from "./wedding-party-style";
import {
  resolveCouplePhotoFrame,
  isCutoutCouplePhotoActive,
} from "../shared/CouplePhotoFrame/frame-options";
import { showHeroScheduleCards } from "./hero-card-visibility";

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

// Livestream renderer — lives under features/ (cross-template, not V3-specific)
import { LivestreamSection } from "@/components/features/Livestream";

// Shared utilities
import {
  MAX_VISIBLE_NAV_ITEMS,
  orderSectionsForNav,
  resolveNavLabel,
} from "@/lib/section-nav-defaults";

// V2 global styles (shared across V3 templates until each gets its own)
import "../wedding-v2/WeddingTemplateV2.module.css";

// ---------------------------------------------------------------------------
// Label + ID helpers
// ---------------------------------------------------------------------------

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
    livestream: "live",
  };
  return ids[type] || type;
}

/**
 * Drops the `isInPageGallery` discriminator we add for the
 * Album-demotion logic. `isCta` is preserved so nav renderers can
 * style RSVP / Album as pills alongside regular items.
 */
function stripFlag<
  T extends { id: string; label: string; href: string; isCta?: boolean },
>(c: T): { id: string; label: string; href: string; isCta?: boolean } {
  return { id: c.id, label: c.label, href: c.href, isCta: c.isCta };
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
  // Wedding party renderer is resolved per-render (not here): when the template
  // offers organizer-selectable styles, the choice lives on section.data.

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
    livestreamMode = "full",
    initialNowMs,
    inviteToken,
    navLinkBase,
    subPageSection,
    postEventGalleryCta,
    postEventGalleryTeaser,
    postEventGalleryHref,
  }: TemplateProps) {
    const { theme, hero, sections } = config;
    const primaryColor = theme.primaryColor;
    const socialLinks = definition.supportsSocialLinks ? config.socialLinks : undefined;

    // Generate tokens from the definition's theme pack
    const cssVars = getV3CSSVariables(defaultThemePack, primaryColor, definition.motionPreset);
    const glassVars = getV3GlassVariables(defaultThemePack);
    const fontUrl = getV3FontUrl(defaultThemePack);

    // Resolve the optional section theme (recolors the feature surfaces — nav,
    // hero cards, countdown strip, RSVP, schedule, footer — as a group) into a
    // map of --lux-* CSS variables injected on the article below. An unset or
    // unknown id yields no vars, so every themed surface (the countdown strip
    // included — it reads --lux-* directly) falls back to the default look.
    const luxVars = useMemo(() => {
      const active = theme.sectionThemeId
        ? definition.sectionThemes?.find((t) => t.id === theme.sectionThemeId)
        : undefined;
      if (!active) return undefined;
      const vars = getSectionThemeVariables(active);
      // Accent-ink contrast: --lux-accent-ink is the text on the accent fill
      // (CTA pill / RSVP button). --lux-accent flows from the live accent
      // (the theme's pinned accent, else the organizer's primaryColor). The
      // generator defaults the ink to the dark panel — elegant on a light
      // accent (gold), but unreadable on a dark accent (e.g. the "Noir"
      // swatch). Pick whichever of the panel / white contrasts better.
      // HEX6_RE guards the accent (the one untrusted color: a theme's pinned
      // accent or the organizer's primaryColor). A non-6-hex value would make
      // the luminance math NaN/throw, so skip and keep the generator's panel
      // default. --lux-panel is always a guarded hex.
      const accent = active.accent ?? primaryColor;
      if (accent && HEX6_RE.test(accent)) {
        vars["--lux-accent-ink"] = mostReadable(accent, "#ffffff", vars["--lux-panel"]);
      }
      return vars;
      // definition is a stable factory-closure constant, not a reactive dep.
    }, [theme.sectionThemeId, primaryColor]);

    // Find hero asset
    const heroAsset = hero.heroImageAssetId
      ? assets.find((a) => a.id === hero.heroImageAssetId)
      : null;

    // Find couple photo asset (optional portrait)
    const couplePhotoAsset = hero.couplePhotoAssetId
      ? assets.find((a) => a.id === hero.couplePhotoAssetId)
      : null;

    // Frame shape for the couple photo — unset/unknown resolves to the
    // definition's first curated option; undefined when the template
    // declares no options (hero falls back to its built-in shape).
    const couplePhotoFrame = resolveCouplePhotoFrame(
      definition.couplePhotoFrameOptions,
      hero.couplePhotoFrame,
    );

    // An active cutout suppresses the hero info cards (the cutout occupies
    // their corner). Computed here so the schedule half of the suppression
    // is factory-level — a hero that enrolls cutout later gets it for free.
    // The countdown half stays per-hero (each hero derives its countdown
    // from useTemporal), so enrolling heroes must still gate it.
    const cutoutActive = isCutoutCouplePhotoActive({
      resolvedFrame: couplePhotoFrame,
      hasCouplePhoto: !!couplePhotoAsset?.publicUrl,
      backgroundTreatment: hero.backgroundTreatment,
    });

    // Build schedule cards for hero. Gated here ONCE on the organizer's
    // opt-out flag (unset = visible) — every hero renderer hides its schedule
    // card when this is undefined, so no per-hero checks are needed.
    const scheduleCards = useMemo(() => {
      if (!showHeroScheduleCards(hero) || cutoutActive) return undefined;
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
      // hero is the config object ref; the flag is the only field read here.
    }, [sections, hero, cutoutActive]);

    const { visibleNav, overflowNav } = useMemo(() => {
      const candidates = orderSectionsForNav(sections, "wedding").map((s) => {
        const id = getSectionId(s.type);
        const label = resolveNavLabel(s, "wedding");
        const isOnPage = !navLinkBase || s.type === subPageSection;
        const href = isOnPage ? `#${id}` : `${navLinkBase}#${id}`;
        return {
          id,
          label,
          href,
          isCta: s.type === "rsvp",
          isInPageGallery: s.type === "gallery",
        };
      });

      // PR H policy when Album is present (mirrors V2):
      //   1. The in-page "gallery" section's nav entry is DEMOTED to
      //      overflow (not removed) — disambiguates "Gallery"
      //      (pre-event teaser) from "Album" (post-event destination).
      //      The section still renders in the page body if enabled.
      //   2. Album joins RSVP as a second CTA pill, pinned to visible.
      //   3. Cap bumps by 1 so neither CTA pushes the last organizer-
      //      configured section out of the visible row.
      const inPageGallery = postEventGalleryHref
        ? candidates.find((c) => c.isInPageGallery)
        : undefined;
      const albumItem = postEventGalleryHref
        ? {
            id: POST_EVENT_GALLERY_NAV_ID,
            label: POST_EVENT_GALLERY_NAV_LABEL,
            href: postEventGalleryHref,
            isCta: true,
            isInPageGallery: false,
          }
        : undefined;
      if (albumItem) candidates.push(albumItem);

      const ctas = candidates.filter((c) => c.isCta);
      const otherNonCtas = candidates.filter(
        (c) => !c.isCta && c !== inPageGallery,
      );
      const cap =
        MAX_VISIBLE_NAV_ITEMS.wedding + (postEventGalleryHref ? 1 : 0);
      const headSlots = cap - ctas.length;
      const visible = otherNonCtas.slice(0, headSlots).map(stripFlag);
      const overflow = otherNonCtas.slice(headSlots).map(stripFlag);
      if (inPageGallery) overflow.push(stripFlag(inPageGallery));
      visible.push(...ctas.map(stripFlag));
      return { visibleNav: visible, overflowNav: overflow };
    }, [sections, navLinkBase, subPageSection, postEventGalleryHref]);

    const dateText = hero.subtitle || "";

    let sectionIndex = 0;

    const renderSection = (section: (typeof sections)[number], arrayIndex: number) => {
      if (!section.enabled) return null;
      if (navLinkBase && section.type !== subPageSection) return null;

      const key = `${section.type}-${arrayIndex}`;
      const currentSectionIndex = sectionIndex++;
      const sectionLabel = resolveNavLabel(section, "wedding");

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
        case "weddingParty": {
          const WeddingPartyComponent = getWeddingPartyRenderer(
            resolveWeddingPartyStyleId(definition, section.data.displayStyle),
          );
          return wrapWithChrome(wrapWithAnimation(
            <WeddingPartyComponent data={section.data} assets={assets} />
          ));
        }
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
          return eventSlug ? wrapWithChrome(wrapWithAnimation(
            <RSVPComponent data={section.data} eventSlug={eventSlug} />
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
        case "livestream":
          return eventSlug ? wrapWithChrome(wrapWithAnimation(
            <LivestreamSection
              data={section.data}
              eventSlug={eventSlug}
              inviteToken={inviteToken}
              mode={livestreamMode}
              timezone={temporal?.timezone}
              initialNowMs={initialNowMs}
            />
          )) : null;
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
                ...tokensToInline({ ...cssVars, ...glassVars, ...luxVars }),
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
                  Mounted only when a wishes section is enabled; per-card
                  filter URLs (url(#ww-...)) resolve from inside the
                  WishesRenderer cards below. */}
              {sections.some((s) => s.type === "wishes" && s.enabled) && (
                <PaperFilters />
              )}

              {/* Nav */}
              <NavComponent
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={visibleNav}
                overflow={overflowNav}
                accentColor={primaryColor}
                hasHeroImage={!!heroAsset?.publicUrl}
                homeHref={navLinkBase ? `${navLinkBase}#top` : undefined}
                mobileNavExpression={definition.mobileNavExpression}
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
                couplePhotoFrame={couplePhotoFrame}
                scheduleCards={scheduleCards}
                hasDetailsSection={sections.some((s) => s.type === "details" && s.enabled)}
                eventRsvpDeadline={temporal?.rsvpDeadline ?? undefined}
                eventTimezone={temporal?.timezone ?? "UTC"}
              />

              {/* Temporal Hero Overlay (countdown strip below the hero). When a
                  section theme is active it inherits the panel + ink ramp from
                  the --lux-* vars on the article, like every other surface. */}
              <TemporalHeroOverlay accentColor={primaryColor} />

              {/* Prelude (optional welcome note — opt-in per template definition) */}
              {definition.supportsPrelude && (
                <PreludeBlock prelude={config.prelude} />
              )}

              {/* Post-event gallery CTA — slot populated by page. */}
              {postEventGalleryCta}

              {/* Dynamic Sections */}
              {sections.map((section, index) => renderSection(section, index))}

              {/* Post-event gallery teaser — slot populated by page. */}
              {postEventGalleryTeaser}

              {/* Chrome: Footer Decoration */}
              {definition.chromeKit.footerDecoration && (
                <FooterSkyline color={primaryColor} />
              )}

              {/* Footer */}
              <FooterComponent
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={[...visibleNav, ...overflowNav]}
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
