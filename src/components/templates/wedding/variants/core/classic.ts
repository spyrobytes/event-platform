import type { WeddingVariantConfig } from "../types";

/**
 * Classic / Traditional Wedding Variant
 *
 * Best for: Church, ballroom, formal weddings
 * Tone: Formal, elegant, timeless
 * Design: Serif headings, symmetry, minimal motion
 */
export const classicVariant: WeddingVariantConfig = {
  id: "classic",
  displayName: "Classic Elegance",
  description: "Timeless and formal, perfect for traditional celebrations",
  category: "core",
  bestFor: ["church wedding", "ballroom", "formal", "traditional", "black tie"],
  thumbnail: "/templates/wedding/classic-thumb.jpg",

  styleTokens: {
    fontHeading: "classic_serif",
    fontBody: "classic_serif",
    colorPalette: "classic",
    accentColor: "#B76E79",
    decorativeStyle: "elegant",
  },

  sections: [
    {
      type: "hero",
      enabled: true,
      order: 0,
      canDisable: false,
      defaultContent: {
        title: "Sarah & Michael",
        subtitle: "Together with their families, request the pleasure of your company",
      },
    },
    {
      type: "details",
      enabled: true,
      order: 1,
      canDisable: false,
    },
    {
      type: "schedule",
      enabled: true,
      order: 2,
      customHeading: "Order of Events",
      defaultContent: {
        items: [
          { time: "4:00 PM", title: "Ceremony", description: "Please be seated by 3:45 PM" },
          { time: "5:00 PM", title: "Cocktail Hour", description: "Drinks and hors d'oeuvres" },
          { time: "6:00 PM", title: "Reception", description: "Dinner and dancing" },
        ],
      },
    },
    {
      type: "weddingParty",
      enabled: true,
      order: 3,
      customHeading: "The Wedding Party",
    },
    {
      type: "travelStay",
      enabled: true,
      order: 4,
      customHeading: "Accommodations",
    },
    {
      type: "rsvp",
      enabled: true,
      order: 5,
      canDisable: false,
      customHeading: "Kindly Respond",
    },
    {
      type: "faq",
      enabled: true,
      order: 6,
      customHeading: "Questions & Answers",
    },
    {
      type: "gallery",
      enabled: false,
      order: 7,
    },
    {
      type: "map",
      enabled: false,
      order: 8,
    },
  ],

  featureFlags: {
    multiDaySchedule: false,
    culturalTraditions: false,
    bilingual: false,
    weddingParty: true,
    attire: false,
    livestream: false,
    registry: false,
  },

  animations: "subtle",

  mobileOptimizations: {
    stackingSections: true,
    touchGestures: true,
    reducedMotion: true,
  },

  seoDefaults: {
    titleTemplate: "{names} Wedding",
    descriptionTemplate: "You are cordially invited to celebrate the wedding of {names}",
    ogImageStyle: "elegant",
  },

  customizationLevel: "curated",
};
