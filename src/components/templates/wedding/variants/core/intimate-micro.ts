import type { WeddingVariantConfig } from "../types";

/**
 * Intimate / Micro Wedding Variant
 *
 * Best for: Small guest lists, personal ceremonies
 * Tone: Personal, heartfelt, warm
 * Design: Fewer sections, story emphasis, intimate feel
 */
export const intimateMicroVariant: WeddingVariantConfig = {
  id: "intimate_micro",
  displayName: "Intimate Gathering",
  description: "Personal and heartfelt for small celebrations",
  category: "core",
  bestFor: ["micro wedding", "elopement", "small wedding", "intimate", "backyard", "private"],
  thumbnail: "/templates/wedding/intimate-thumb.jpg",

  styleTokens: {
    fontHeading: "romantic_script",
    fontBody: "romantic_script",
    colorPalette: "intimate",
    accentColor: "#9B8AA5",
    decorativeStyle: "floral",
  },

  sections: [
    {
      type: "hero",
      enabled: true,
      order: 0,
      canDisable: false,
      defaultContent: {
        title: "Mia & Ethan",
        subtitle: "An intimate celebration with our dearest friends and family",
        overlay: "soft",
      },
    },
    {
      type: "story",
      enabled: true,
      order: 1,
      customHeading: "A Note From Us",
      defaultContent: {
        content: "We wanted to share this special day with just the people who mean the most to us. Thank you for being one of them. Your presence is the only gift we need.",
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
      customHeading: "Let Us Know You're Coming",
      defaultContent: {
        heading: "Let Us Know You're Coming",
        description: "We can't wait to celebrate with you. Please let us know if you can join us.",
        showMaybeOption: false,
        allowPlusOnes: false,
      },
    },
    {
      type: "faq",
      enabled: true,
      order: 4,
      customHeading: "A Few Details",
      defaultContent: {
        items: [
          { q: "What should I wear?", a: "Whatever makes you comfortable! We're keeping things relaxed." },
          { q: "Can I bring a gift?", a: "Your presence is our present. Please, no gifts." },
        ],
      },
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
    livestream: true, // Often needed for intimate weddings with remote family
    registry: false,
  },

  animations: "subtle",

  mobileOptimizations: {
    stackingSections: true,
    touchGestures: true,
    reducedMotion: true,
  },

  seoDefaults: {
    titleTemplate: "{names}",
    descriptionTemplate: "An intimate celebration of {names}",
    ogImageStyle: "romantic",
  },

  customizationLevel: "curated",
};
