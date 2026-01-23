import type { WeddingVariantConfig } from "../types";

/**
 * Rustic / Outdoor Wedding Variant
 *
 * Best for: Barn, vineyard, countryside weddings
 * Tone: Warm, casual, natural
 * Design: Earthy colors, textured backgrounds, organic feel
 */
export const rusticOutdoorVariant: WeddingVariantConfig = {
  id: "rustic_outdoor",
  displayName: "Rustic Charm",
  description: "Warm and natural for countryside celebrations",
  category: "core",
  bestFor: ["barn wedding", "vineyard", "countryside", "outdoor", "garden", "farm"],
  thumbnail: "/templates/wedding/rustic-thumb.jpg",

  styleTokens: {
    fontHeading: "rustic_warm",
    fontBody: "rustic_warm",
    colorPalette: "rustic",
    accentColor: "#7D8471",
    backgroundPattern: "linen",
    decorativeStyle: "organic",
  },

  sections: [
    {
      type: "hero",
      enabled: true,
      order: 0,
      canDisable: false,
      defaultContent: {
        title: "Olivia & Noah",
        subtitle: "A celebration in the countryside",
        overlay: "soft",
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
      customHeading: "Weekend Festivities",
      defaultContent: {
        items: [
          { time: "Friday 6 PM", title: "Welcome Dinner", description: "Casual gathering at the farmhouse" },
          { time: "Saturday 3 PM", title: "Ceremony", description: "Under the oak tree" },
          { time: "Saturday 4 PM", title: "Reception", description: "Dinner and dancing in the barn" },
          { time: "Sunday 10 AM", title: "Farewell Brunch", description: "Before you head home" },
        ],
      },
    },
    {
      type: "travelStay",
      enabled: true,
      order: 3,
      customHeading: "Where to Stay",
    },
    {
      type: "attire",
      enabled: true,
      order: 4,
      customHeading: "What to Wear",
      defaultContent: {
        dressCode: "Cocktail Attire",
        notes: "The ceremony will be outdoors on grass, so please consider your footwear. The evening may be cool, so bring a layer!",
      },
    },
    {
      type: "gallery",
      enabled: true,
      order: 5,
      customHeading: "Our Journey",
    },
    {
      type: "rsvp",
      enabled: true,
      order: 6,
      canDisable: false,
      customHeading: "Will You Join Us?",
    },
    {
      type: "faq",
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
    multiDaySchedule: true,
    culturalTraditions: false,
    bilingual: false,
    weddingParty: false,
    attire: true,
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
    descriptionTemplate: "Join us for a countryside celebration of {names}",
    ogImageStyle: "natural",
  },

  customizationLevel: "curated",
};
