"use client";

import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { getWeddingVariant, DEFAULT_VARIANT_ID } from "./variants";
import { resolveStyles, stylesToInline } from "./tokens";

// Existing shared sections
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
} from "../WeddingTemplateV1/sections";

// New wedding-specific sections
import {
  StorySection,
  TravelStaySection,
  WeddingPartySection,
  AttireSection,
  ThingsToDoSection,
} from "./sections";

type WeddingTemplateProps = {
  config: EventPageConfigV1;
  assets: MediaAsset[];
  eventId?: string;
};

/**
 * Variant-Aware Wedding Template
 *
 * This template renders wedding pages based on the selected variant.
 * It uses configuration-driven styling and section ordering.
 *
 * Variants: classic, modern_minimal, rustic_outdoor, destination, intimate_micro
 */
export function WeddingTemplate({ config, assets, eventId }: WeddingTemplateProps) {
  const { theme, hero, sections, variantId } = config;

  // Get variant configuration
  const variant = getWeddingVariant(variantId || DEFAULT_VARIANT_ID);

  // Resolve style tokens for this variant
  const styles = resolveStyles(variant.styleTokens);

  // Find hero asset
  const heroAsset = hero.heroImageAssetId
    ? assets.find((a) => a.id === hero.heroImageAssetId)
    : null;

  // Use variant's accent color as primary, or fall back to theme.primaryColor
  const primaryColor = variant.styleTokens.accentColor || theme.primaryColor;

  // Render a section by type
  const renderSection = (section: (typeof sections)[number], index: number) => {
    if (!section.enabled) return null;

    const key = `${section.type}-${index}`;

    switch (section.type) {
      case "details":
        return (
          <DetailsSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "schedule":
        return (
          <ScheduleSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "faq":
        return (
          <FAQSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "gallery":
        return (
          <GallerySection
            key={key}
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        );

      case "rsvp":
        return eventId ? (
          <RSVPSection
            key={key}
            data={section.data}
            eventId={eventId}
            primaryColor={primaryColor}
          />
        ) : null;

      case "speakers":
        return (
          <SpeakersSection
            key={key}
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        );

      case "sponsors":
        return (
          <SponsorsSection
            key={key}
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        );

      case "map":
        return (
          <MapSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      // New wedding-specific sections
      case "story":
        return (
          <StorySection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "travelStay":
        return (
          <TravelStaySection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "weddingParty":
        return (
          <WeddingPartySection
            key={key}
            data={section.data}
            assets={assets}
            primaryColor={primaryColor}
          />
        );

      case "attire":
        return (
          <AttireSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      case "thingsToDo":
        return (
          <ThingsToDoSection
            key={key}
            data={section.data}
            primaryColor={primaryColor}
          />
        );

      default:
        return null;
    }
  };

  return (
    <article
      className="wedding-template min-h-screen"
      style={{
        ...stylesToInline(styles.cssVariables),
        backgroundColor: styles.colors.background,
        color: styles.colors.text,
      }}
      data-variant={variant.id}
    >
      {/* Hero Section - Always rendered */}
      <HeroSection
        config={hero}
        heroAsset={heroAsset}
        primaryColor={primaryColor}
      />

      {/* Dynamic Sections */}
      {sections.map((section, index) => renderSection(section, index))}

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{
          borderColor: styles.colors.border,
          color: styles.colors.textMuted,
        }}
      >
        <p>Powered by EventsFixer</p>
      </footer>
    </article>
  );
}
