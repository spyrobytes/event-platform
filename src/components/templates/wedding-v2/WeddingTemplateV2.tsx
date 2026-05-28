"use client";

import { useMemo, Fragment, type ReactNode } from "react";
import {
  POST_EVENT_GALLERY_NAV_ID,
  POST_EVENT_GALLERY_NAV_LABEL,
} from "@/lib/gallery-urls";
import type { EventPageConfigV1, ChromeConfig } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import {
  AnimationProvider,
  AnimatedWrapper,
  SectionNavProvider,
  SectionNav,
  TemporalProvider,
  TemporalHeroOverlay,
  PreludeBlock,
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

// V3 scrapbook renderers (used by scrapbook_edition variant)
import { ScrapbookCollage } from "../wedding-v3/renderers/gallery/ScrapbookCollage";
import { ScrapbookWeddingParty } from "../wedding-v3/renderers/wedding-party/ScrapbookWeddingParty";

// V3 wedding-wishes renderer + ripped-paper filter SVG defs.
// Reused here so v2 events that enable a wishes section actually render it.
import { WishesRenderer } from "../wedding-v3/renderers/wishes/WishesRenderer";
import { PaperFilters } from "../wedding-v3/renderers/wishes/PaperFilters";
import { LivestreamSection } from "@/components/features/Livestream";
import type { ApprovedWishDTO } from "../index";

// V2 tokens + variants + footer + global styles
import { getV2CSSVariables, getV2GlassVariables, getV2FontUrl, v2TokensToInline } from "./tokens";
import { getV2Variant } from "./variants";
import type { V2BotanicalVariant } from "./variants";
import { WeddingV2Footer } from "./WeddingV2Footer";
import "./WeddingTemplateV2.module.css";

import {
  MAX_VISIBLE_NAV_ITEMS,
  orderSectionsForNav,
  resolveNavLabel,
} from "@/lib/section-nav-defaults";

type WeddingTemplateV2Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  eventSlug?: string;
  temporal?: TemporalData;
  registryClaims?: Record<string, {
    itemId: string;
    claimedByOthers: number;
    myClaimId: string | null;
    myClaimQuantity: number;
  }>;
  canClaim?: boolean;
  registryMode?: "preview" | "full";
  approvedWishes?: ApprovedWishDTO[];
  wishesMode?: "preview" | "full";
  livestreamMode?: "preview" | "full";
  /** Server-captured Date.now() at request time (see TemplateProps). */
  initialNowMs?: number;
  inviteToken?: string;
  navLinkBase?: string;
  /** When set with `navLinkBase`, only this section type renders inline;
   *  others link back via the nav. Used by `/e/[slug]/registry` and
   *  `/e/[slug]/wishes` sub-pages. */
  subPageSection?: string;
  /** True when the event is PUBLIC; the Topbar then renders a share
   *  button alongside its other actions. */
  canShare?: boolean;
  /** Slots populated by the page when a post-event gallery is published.
   *  See TemplateProps in src/components/templates/index.ts. */
  postEventGalleryCta?: ReactNode;
  postEventGalleryTeaser?: ReactNode;
  /** When set, V2's Topbar appends a synthetic "Photos" nav entry —
   *  the same pattern V3 uses (PR E shipped it; this PR brings V2
   *  in line). The cap below treats it like any other section so a
   *  fully-saturated wedding pushes Photos into the overflow menu. */
  postEventGalleryHref?: string;
};

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
    wishes: "wishes",
    livestream: "live",
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
export function WeddingTemplateV2({
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
  canShare,
  postEventGalleryCta,
  postEventGalleryTeaser,
  postEventGalleryHref,
}: WeddingTemplateV2Props) {
  const { theme, hero, sections, chrome: chromeConfig, variantId } = config;

  // Resolve variant (if set)
  const variant = variantId ? getV2Variant(variantId) : null;

  // Font pair: variant overrides theme.fontPair
  const fontPair = variant?.fontPair || theme.fontPair;

  // V2 token system: user's primaryColor → --accent, fontPair → font families
  const primaryColor = theme.primaryColor;
  const cssVars = getV2CSSVariables(primaryColor, fontPair, variant?.palette);
  const glassVars = getV2GlassVariables(variant?.glass);
  const fontUrl = getV2FontUrl(fontPair);

  // Resolve chrome settings: explicit config > variant defaults > all-true
  const chrome: ChromeConfig = {
    topbar: chromeConfig?.topbar ?? variant?.chromeDefaults?.topbar ?? true,
    scrollProgress: chromeConfig?.scrollProgress ?? variant?.chromeDefaults?.scrollProgress ?? true,
    mountainDividers: chromeConfig?.mountainDividers ?? variant?.chromeDefaults?.mountainDividers ?? true,
    footerSkyline: chromeConfig?.footerSkyline ?? variant?.chromeDefaults?.footerSkyline ?? true,
    botanicals: chromeConfig?.botanicals ?? variant?.chromeDefaults?.botanicals ?? true,
  };

  // Botanical variant from variant config
  const botanicalVariant: V2BotanicalVariant = variant?.chromeDefaults?.botanicalVariant || "sage";

  // Canonical share URL — always points at /e/[slug], even on sub-pages
  // (registry/wishes), since that's the indexable, shareable surface.
  // Falls back to an empty string when slug is absent (template preview);
  // the Topbar declines to render the share button without a URL.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const shareUrl = eventSlug ? `${baseUrl}/e/${eventSlug}` : "";

  // Find hero asset
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Find couple photo asset (optional portrait overlay on cinematic hero)
  const couplePhotoAsset = hero.couplePhotoAssetId
    ? assets.find((a) => a.id === hero.couplePhotoAssetId)
    : null;

  // Build schedule cards from actual schedule section data for the hero float card
  const scheduleCards = useMemo(() => {
    const scheduleSec = sections.find((s) => s.type === "schedule");
    if (!scheduleSec || scheduleSec.type !== "schedule") return undefined;

    // Prefer groups (multi-day): show all items from each group
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

    // Fallback: flat items
    const items = scheduleSec.data.items;
    if (!items || items.length === 0) return undefined;
    return items.slice(0, 4).map((item) => ({
      day: item.time,
      info: item.title,
    }));
  }, [sections]);

  // Build nav sections from enabled sections. On sub-pages (navLinkBase set),
  // non-registry links point back to the main event page.
  //
  // The RSVP entry is special-cased: it links directly to the code-gated
  // portal at /e/[slug]/rsvp (skipping the on-page section's redundant
  // scroll-then-click) and is flagged as a CTA so the Topbar styles it as a
  // pill button. When eventSlug is unavailable (preview without slug context),
  // we fall back to the standard anchor scroll.
  const { visibleNav, overflowNav } = useMemo(() => {
    const candidates = orderSectionsForNav(sections, "wedding").map((s) => {
      const id = getSectionId(s.type);
      const label = resolveNavLabel(s, "wedding");
      const isOnPage = !navLinkBase || s.type === subPageSection;
      const isRsvp = s.type === "rsvp";
      const href = isRsvp && eventSlug
        ? `/e/${eventSlug}/rsvp`
        : isOnPage
          ? `#${id}`
          : `${navLinkBase}#${id}`;
      return {
        id,
        label,
        href,
        isCta: isRsvp,
        isInPageGallery: s.type === "gallery",
      };
    });

    // PR H policy when Album is present:
    //   1. The in-page "gallery" section's nav entry is DEMOTED to
    //      overflow (not removed). The Topbar's "More" dropdown shows
    //      it; the page body still renders the section if enabled.
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
    const visible = otherNonCtas.slice(0, headSlots);
    const overflow = otherNonCtas.slice(headSlots);
    if (inPageGallery) overflow.push(inPageGallery);
    visible.push(...ctas);
    return { visibleNav: visible, overflowNav: overflow };
  }, [sections, navLinkBase, subPageSection, eventSlug, postEventGalleryHref]);

  // Date text for topbar/footer
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

    // Botanical accent placement (matches POC)
    // Use variant's botanical variant; alternate with gold for visual variety
    const altBotanical = botanicalVariant === "gold" ? "sage" : botanicalVariant === "none" ? "sage" : "gold";
    const BOTANICAL_PLACEMENTS: Record<string, React.ReactNode> = {
      story: <Botanical variant={botanicalVariant === "none" ? "sage" : botanicalVariant} style={{ top: 40, right: "5%", width: 120, height: 200, transform: "rotate(15deg)" }} />,
      gallery: <Botanical variant={altBotanical} style={{ top: 20, left: "3%", width: 80, height: 140, transform: "rotate(-20deg) scaleX(-1)" }} />,
      details: <Botanical variant={botanicalVariant === "none" ? "sage" : botanicalVariant} style={{ bottom: 60, left: "2%", width: 100, height: 160, transform: "rotate(-10deg)" }} />,
      travelStay: <Botanical variant={altBotanical} style={{ top: 80, right: "3%", width: 90, height: 150, transform: "rotate(12deg)" }} />,
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

      case "gallery": {
        const GalleryComp = variant?.galleryRenderer === "scrapbook"
          ? ScrapbookCollage
          : MasonryGallery;
        return wrapWithChrome(wrapWithAnimation(
          <GalleryComp data={section.data} assets={assets} />
        ));
      }

      case "weddingParty": {
        const PartyComp = variant?.weddingPartyRenderer === "scrapbook"
          ? ScrapbookWeddingParty
          : WeddingPartyV2;
        return wrapWithChrome(wrapWithAnimation(
          <PartyComp data={section.data} assets={assets} />
        ));
      }

      case "travelStay":
        return wrapWithChrome(wrapWithAnimation(
          <TravelStayV2 data={section.data} />
        ));

      case "registry":
        return wrapWithChrome(wrapWithAnimation(
          <RegistrySection
            data={section.data}
            assets={assets}
            eventId={eventId}
            eventSlug={eventSlug}
            claims={registryClaims}
            canClaim={canClaim}
            mode={registryMode}
          />
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
        return eventSlug ? wrapWithChrome(wrapWithAnimation(
          <RSVPV2 data={section.data} eventSlug={eventSlug} />
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

      case "wishes":
        return wrapWithChrome(wrapWithAnimation(
          <WishesRenderer
            data={section.data}
            approvedWishes={approvedWishes}
            wishesMode={wishesMode}
            eventSlug={eventSlug}
            inviteToken={inviteToken}
          />
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
          staggerDelay={75}
          enableStagger={true}
        >
          {/* Load Google Fonts for the selected font pair */}
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={fontUrl} />

          <article
            className="wedding-template-v2"
            style={{
              ...v2TokensToInline({ ...cssVars, ...glassVars }),
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              fontFamily: "var(--sans)",
              fontSize: "var(--body)",
              lineHeight: 1.7,
              minHeight: "100vh",
              overflowX: "hidden",
            }}
            data-template="wedding-v2"
          >
            {/* SVG defs for the Wedding Wishes ripped-paper effect.
                Mounted only when a wishes section is enabled; per-card
                filter URLs (url(#ww-...)) resolve from inside the
                WishesRenderer cards below. */}
            {sections.some((s) => s.type === "wishes" && s.enabled) && (
              <PaperFilters />
            )}

            {/* Chrome: Topbar */}
            {chrome.topbar && (
              <Topbar
                monogram={hero.monogram}
                coupleNames={hero.coupleNames}
                dateText={dateText}
                sections={visibleNav}
                overflow={overflowNav}
                accentColor={primaryColor}
                homeHref={navLinkBase ? `${navLinkBase}#top` : undefined}
                canShare={canShare ?? false}
                shareTitle={hero.coupleNames || ""}
                shareUrl={shareUrl}
              />
            )}

            {/* Chrome: Scroll Progress */}
            {chrome.scrollProgress && (
              <ScrollProgress
                accentColor={primaryColor}
                gradient={variant?.scrollProgressGradient}
              />
            )}

            {/* Hero Section */}
            <CinematicHero
              config={hero}
              heroAsset={heroAsset}
              couplePhotoAsset={couplePhotoAsset}
              scheduleCards={scheduleCards}
              hasDetailsSection={sections.some((s) => s.type === "details" && s.enabled)}
              eventRsvpDeadline={temporal?.rsvpDeadline ?? undefined}
              eventTimezone={temporal?.timezone ?? "UTC"}
            />

            {/* Temporal Hero Overlay */}
            <TemporalHeroOverlay accentColor={primaryColor} />

            {/* Prelude (optional welcome note rendered between hero and first section) */}
            <PreludeBlock prelude={config.prelude} />

            {/* Post-event gallery CTA — slot populated by page. */}
            {postEventGalleryCta}

            {/* Dynamic Sections */}
            {sections.map((section, index) => renderSection(section, index))}

            {/* Post-event gallery teaser — slot populated by page. */}
            {postEventGalleryTeaser}

            {/* Chrome: Footer Skyline */}
            {chrome.footerSkyline && (
              <FooterSkyline color={primaryColor} />
            )}

            {/* Footer */}
            <WeddingV2Footer
              monogram={hero.monogram}
              coupleNames={hero.coupleNames}
              dateText={dateText}
              sections={[...visibleNav, ...overflowNav]}
              socialLinks={config.socialLinks}
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
