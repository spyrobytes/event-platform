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

type WeddingTemplateV1Props = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
};

/**
 * Classic Wedding Template (v1)
 *
 * A romantic, elegant template for wedding celebrations.
 * Features soft typography and a warm color palette.
 */
export function WeddingTemplateV1({ config, assets, eventId }: WeddingTemplateV1Props) {
  const { theme, hero, sections } = config;
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  return (
    <article className="wedding-template-v1 min-h-screen bg-background">
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
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Powered by EventsFixer</p>
      </footer>
    </article>
  );
}
