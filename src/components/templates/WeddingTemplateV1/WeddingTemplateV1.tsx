"use client";

import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { AnimationProvider, AnimatedWrapper, SectionNavProvider, SectionNav } from "../shared";
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

type WeddingTemplateV1Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
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
  };
  return labels[type] || type;
}

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
export function WeddingTemplateV1({ config, assets, eventId }: WeddingTemplateV1Props) {
  const { theme, hero, sections } = config;
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Track section index for stagger animation
  let sectionIndex = 0;

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

          {/* Dynamic Sections with staggered animations */}
          {sections.map((section, index) => {
            if (!section.enabled) return null;

            const key = `${section.type}-${index}`;
            const currentSectionIndex = sectionIndex++;
            const sectionLabel = getSectionLabel(section.type);

            // Common wrapper for animation and nav registration
            const wrapWithAnimation = (content: React.ReactNode) => (
              <AnimatedWrapper
                key={key}
                sectionIndex={currentSectionIndex}
                navId={section.type}
                navLabel={sectionLabel}
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
                return eventId ? wrapWithAnimation(
                  <RSVPSection
                    data={section.data}
                    eventId={eventId}
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

              default:
                return null;
            }
          })}

          {/* Footer */}
          <footer className="border-t py-8 text-center text-sm text-muted-foreground">
            <p>Powered by EventFXr</p>
          </footer>
        </article>

        {/* Floating Section Navigation */}
        <SectionNav accentColor={theme.primaryColor} />
      </AnimationProvider>
    </SectionNavProvider>
  );
}
