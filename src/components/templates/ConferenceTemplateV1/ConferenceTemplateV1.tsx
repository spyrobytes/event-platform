import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
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

type ConferenceTemplateV1Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
};

/**
 * Modern Conference Template (v1)
 *
 * A professional, clean template for conferences and corporate events.
 * Features structured layouts, clear typography, and a modern aesthetic.
 */
export function ConferenceTemplateV1({ config, assets, eventId }: ConferenceTemplateV1Props) {
  const { theme, hero, sections } = config;
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  return (
    <article className="conference-template-v1 min-h-screen bg-background">
      {/* Hero Section - Always rendered */}
      <HeroSection
        config={hero}
        heroAsset={heroAsset}
        primaryColor={theme.primaryColor}
      />

      {/* Dynamic Sections */}
      {sections.map((section, index) => {
        if (!section.enabled) return null;

        switch (section.type) {
          case "details":
            return (
              <DetailsSection
                key={`${section.type}-${index}`}
                data={section.data}
                primaryColor={theme.primaryColor}
              />
            );

          case "schedule":
            return (
              <ScheduleSection
                key={`${section.type}-${index}`}
                data={section.data}
                primaryColor={theme.primaryColor}
              />
            );

          case "faq":
            return (
              <FAQSection
                key={`${section.type}-${index}`}
                data={section.data}
                primaryColor={theme.primaryColor}
              />
            );

          case "gallery":
            return (
              <GallerySection
                key={`${section.type}-${index}`}
                data={section.data}
                assets={assets}
                primaryColor={theme.primaryColor}
              />
            );

          case "rsvp":
            return eventId ? (
              <RSVPSection
                key={`${section.type}-${index}`}
                data={section.data}
                eventId={eventId}
                primaryColor={theme.primaryColor}
              />
            ) : null;

          case "speakers":
            return (
              <SpeakersSection
                key={`${section.type}-${index}`}
                data={section.data}
                assets={assets}
                primaryColor={theme.primaryColor}
              />
            );

          case "sponsors":
            return (
              <SponsorsSection
                key={`${section.type}-${index}`}
                data={section.data}
                assets={assets}
                primaryColor={theme.primaryColor}
              />
            );

          case "map":
            return (
              <MapSection
                key={`${section.type}-${index}`}
                data={section.data}
                primaryColor={theme.primaryColor}
              />
            );

          default:
            return null;
        }
      })}

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        <p>Powered by EventsFixer</p>
      </footer>
    </article>
  );
}
