"use client";

import type { ReactNode } from "react";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { AnimationProvider, AnimatedWrapper, SectionNavProvider, SectionNav } from "../shared";
import { FloatingMobileNavMenu } from "../shared/MobileNavMenu";
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
} from "./sections";
import { LivestreamSection } from "@/components/features/Livestream";

type WeddingTemplateV1Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
  eventSlug?: string;
  /** Temporal data for time-aware rendering. */
  temporal?: { startAt: string | null; endAt: string | null; timezone: string; rsvpDeadline: string | null };
  /** Livestream rendering mode (see TemplateProps). */
  livestreamMode?: "preview" | "full";
  /** Server-captured Date.now() at request time (see TemplateProps). */
  initialNowMs?: number;
  /** Guest invite token forwarded into deep links (e.g. /e/[slug]/live). */
  inviteToken?: string;
  /** Slots populated by the page when a post-event gallery is published.
   *  See TemplateProps in src/components/templates/index.ts. */
  postEventGalleryCta?: ReactNode;
  postEventGalleryTeaser?: ReactNode;
  /** Appended as a "Photos" item in the mobile drawer when set —
   *  matches V2/V3's nav-injection pattern. Desktop on V1 uses the
   *  floating SectionNav dot rail (anchor-only), which doesn't fit a
   *  cross-page link; mobile drawers do. */
  postEventGalleryHref?: string;
};

import { resolveNavLabel, shouldShowInNav } from "@/lib/section-nav-defaults";
import {
  POST_EVENT_GALLERY_NAV_ID,
  POST_EVENT_GALLERY_NAV_LABEL,
} from "@/lib/gallery-urls";

/**
 * Classic Wedding Template (v1) - Legacy
 *
 * A romantic, elegant template for wedding celebrations.
 * Features soft typography and a warm color palette.
 *
 * Note: For new weddings, use WeddingTemplate (wedding_v1) instead,
 * which supports variant selection.
 *
 * Features:
 * - Scroll-triggered section animations (subtle for elegance)
 * - Staggered section reveals for polished appearance
 * - Reduced motion preference support
 */
export function WeddingTemplateV1({
  config,
  assets,
  eventId,
  eventSlug,
  temporal,
  livestreamMode = "full",
  initialNowMs,
  inviteToken,
  postEventGalleryCta,
  postEventGalleryTeaser,
  postEventGalleryHref,
}: WeddingTemplateV1Props) {
  const { theme, hero, sections } = config;
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Track section index for stagger animation
  let sectionIndex = 0;

  // Mobile drawer items mirror the dot-rail registration rules so labels,
  // order, and inclusion match the desktop nav exactly. RSVP is pinned
  // to the bottom as the CTA. PR H policy: when Album is published,
  // the in-page "gallery" section stays in the section list (V1 has
  // no overflow concept — the drawer shows everything — so "demote to
  // overflow" maps to "keep in the regular list, just not as a CTA").
  // Album joins RSVP as a second CTA pill below the section list.
  const mobileNavItems = [
    ...sections
      .filter((s) => s.enabled && shouldShowInNav(s, "wedding"))
      .filter((s) => s.type !== "rsvp" || Boolean(eventSlug))
      .map((s) => ({
        id: s.type,
        label: resolveNavLabel(s, "wedding"),
        href: `#${s.type}`,
        isCta: s.type === "rsvp",
      })),
    // Album joins as the second CTA pill — MobileNavMenu partitions by
    // `isCta` and renders the CTA group as button-pills below the
    // section list, so Album sits alongside RSVP at the bottom.
    ...(postEventGalleryHref
      ? [
          {
            id: POST_EVENT_GALLERY_NAV_ID,
            label: POST_EVENT_GALLERY_NAV_LABEL,
            href: postEventGalleryHref,
            isCta: true,
          },
        ]
      : []),
  ];

  return (
    <SectionNavProvider>
      <AnimationProvider
        animationLevel="subtle"
        staggerDelay={75}
        enableStagger={true}
      >
        <article className="wedding-template-v1 min-h-screen bg-background">
          {/* Hero Section - Always rendered, no animation wrapper */}
          <HeroSection
            config={hero}
            heroAsset={heroAsset}
            primaryColor={theme.primaryColor}
          />

          {/* Post-event gallery CTA — slot populated by page when a
              published gallery exists. See TemplateProps. */}
          {postEventGalleryCta}

          {/* Dynamic Sections with staggered animations */}
          {sections.map((section, index) => {
            if (!section.enabled) return null;

            const key = `${section.type}-${index}`;
            const currentSectionIndex = sectionIndex++;
            const inNav = shouldShowInNav(section, "wedding");
            const sectionLabel = resolveNavLabel(section, "wedding");

            // Common wrapper for animation and nav registration
            const wrapWithAnimation = (content: React.ReactNode) => (
              <AnimatedWrapper
                key={key}
                sectionIndex={currentSectionIndex}
                navId={inNav ? section.type : undefined}
                navLabel={inNav ? sectionLabel : undefined}
                setDomId
              >
                {content}
              </AnimatedWrapper>
            );

            switch (section.type) {
              case "details":
                return wrapWithAnimation(
                  <DetailsSection
                    data={section.data}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "schedule":
                return wrapWithAnimation(
                  <ScheduleSection
                    data={section.data}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "faq":
                return wrapWithAnimation(
                  <FAQSection
                    data={section.data}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "gallery":
                return wrapWithAnimation(
                  <GallerySection
                    data={section.data}
                    assets={assets}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "rsvp":
                return eventSlug ? wrapWithAnimation(
                  <RSVPSection
                    data={section.data}
                    eventSlug={eventSlug}
                    primaryColor={theme.primaryColor}
                  />
                ) : null;

              case "speakers":
                return wrapWithAnimation(
                  <SpeakersSection
                    data={section.data}
                    assets={assets}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "sponsors":
                return wrapWithAnimation(
                  <SponsorsSection
                    data={section.data}
                    assets={assets}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "map":
                return wrapWithAnimation(
                  <MapSection
                    data={section.data}
                    primaryColor={theme.primaryColor}
                  />
                );

              case "livestream":
                return eventSlug ? wrapWithAnimation(
                  <LivestreamSection
                    data={section.data}
                    eventSlug={eventSlug}
                    inviteToken={inviteToken}
                    mode={livestreamMode}
                    timezone={temporal?.timezone}
                    initialNowMs={initialNowMs}
                  />
                ) : null;

              default:
                return null;
            }
          })}

          {/* Post-event gallery teaser — slot populated by page. */}
          {postEventGalleryTeaser}

          {/* Footer */}
          <footer className="border-t py-8 text-center text-sm text-muted-foreground">
            <p>Powered by EventFXr</p>
          </footer>
        </article>

        {/* Floating Section Navigation (desktop dot rail) */}
        <SectionNav accentColor={theme.primaryColor} />

        {/* Mobile hamburger drawer — dot rail is hidden ≤768px */}
        <FloatingMobileNavMenu
          items={mobileNavItems}
          brand={hero.title}
          accentColor={theme.primaryColor}
        />
      </AnimationProvider>
    </SectionNavProvider>
  );
}
