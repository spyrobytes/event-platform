import type { WeddingVariantConfig } from "../types";

/**
 * Modern Minimal Wedding Variant
 *
 * Best for: City weddings, design-forward couples
 * Tone: Concise, contemporary, clean
 * Design: Whitespace, large type, subtle transitions
 */
export const modernMinimalVariant: WeddingVariantConfig = {
  id: "modern_minimal",
  displayName: "Modern Minimal",
  description: "Clean and contemporary for the design-forward couple",
  category: "core",
  bestFor: ["city wedding", "loft", "modern venue", "minimalist", "urban"],
  thumbnail: "/templates/wedding/modern-minimal-thumb.jpg",

  styleTokens: {
    fontHeading: "minimal_clean",
    fontBody: "minimal_clean",
    colorPalette: "modern_minimal",
    accentColor: "#1A1A1A",
    decorativeStyle: "none",
  },

  sections: [
    {
      type: "hero",
      enabled: true,
      order: 0,
      canDisable: false,
      defaultContent: {
        title: "Emma & James",
        subtitle: "are getting married",
        align: "center",
      },
    },
    {
      type: "story",
      enabled: true,
      order: 1,
      customHeading: "Our Story",
      defaultContent: {
        content: "A brief note about how we met and why we're so excited to celebrate with you.",
        layout: "full",
      },
    },
    {
      type: "details",
      enabled: true,
      order: 2,
      canDisable: false,
    },
    {
      type: "rsvp",
      enabled: true,
      order: 3,
      canDisable: false,
      customHeading: "RSVP",
    },
    {
      type: "faq",
      enabled: true,
      order: 4,
      customHeading: "FAQ",
    },
    {
      type: "schedule",
      enabled: false,
      order: 5,
    },
    {
      type: "gallery",
      enabled: false,
      order: 6,
    },
    {
      type: "map",
      enabled: false,
      order: 7,
    },
  ],

  featureFlags: {
    multiDaySchedule: false,
    culturalTraditions: false,
    bilingual: false,
    weddingParty: false,
    attire: false,
    livestream: false,
    registry: false,
  },

  animations: "subtle",

  mobileOptimizations: {
    stackingSections: true,
    touchGestures: true,
    reducedMotion: false,
  },

  seoDefaults: {
    titleTemplate: "{names}",
    descriptionTemplate: "Join us for the wedding of {names}",
    ogImageStyle: "minimal",
  },

  customizationLevel: "curated",
};
