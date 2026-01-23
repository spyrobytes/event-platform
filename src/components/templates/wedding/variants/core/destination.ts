import type { WeddingVariantConfig } from "../types";

/**
 * Destination Wedding Variant
 *
 * Best for: International or multi-day weddings
 * Tone: Helpful, informative, itinerary-driven
 * Design: Airy layout, clear info cards, maps emphasis
 */
export const destinationVariant: WeddingVariantConfig = {
  id: "destination",
  displayName: "Destination Adventure",
  description: "Informative and helpful for travel weddings",
  category: "core",
  bestFor: ["destination wedding", "beach", "resort", "international", "tropical", "multi-day"],
  thumbnail: "/templates/wedding/destination-thumb.jpg",

  styleTokens: {
    fontHeading: "modern_sans",
    fontBody: "modern_sans",
    colorPalette: "destination",
    accentColor: "#4A7C94",
    decorativeStyle: "none",
  },

  sections: [
    {
      type: "hero",
      enabled: true,
      order: 0,
      canDisable: false,
      defaultContent: {
        title: "Ava & Liam",
        subtitle: "Join us in Tuscany",
        overlay: "soft",
      },
    },
    {
      type: "travelStay",
      enabled: true,
      order: 1,
      customHeading: "Getting There & Where to Stay",
      defaultContent: {
        hotels: [
          {
            name: "Villa Rosetta",
            address: "Via delle Rose 15, Siena",
            bookingUrl: "",
            blockCode: "AVALIAM24",
            deadline: "Book by August 1st for group rate",
          },
        ],
        notes: "We recommend flying into Florence (FLR) airport. Shuttles will be provided from the hotel to all events.",
      },
    },
    {
      type: "schedule",
      enabled: true,
      order: 2,
      customHeading: "Wedding Weekend",
      defaultContent: {
        items: [
          { time: "Thursday", title: "Arrival Day", description: "Check in and explore the area" },
          { time: "Friday 7 PM", title: "Welcome Dinner", description: "Meet everyone at the villa" },
          { time: "Saturday 4 PM", title: "Ceremony", description: "In the olive grove" },
          { time: "Saturday 6 PM", title: "Reception", description: "Dinner under the stars" },
          { time: "Sunday 11 AM", title: "Farewell Brunch", description: "One last gathering" },
        ],
      },
    },
    {
      type: "thingsToDo",
      enabled: true,
      order: 3,
      customHeading: "While You're Here",
      defaultContent: {
        description: "Make the most of your trip! Here are our favorite spots.",
        items: [],
      },
    },
    {
      type: "rsvp",
      enabled: true,
      order: 4,
      canDisable: false,
      customHeading: "RSVP",
    },
    {
      type: "faq",
      enabled: true,
      order: 5,
      customHeading: "Travel FAQ",
      defaultContent: {
        items: [
          { q: "Do I need a visa?", a: "US citizens do not need a visa for stays under 90 days in Italy." },
          { q: "What's the weather like?", a: "Expect warm, sunny days around 75-85°F in September." },
          { q: "Is there a dress code?", a: "Cocktail attire for the wedding. Comfortable clothes for other events." },
        ],
      },
    },
    {
      type: "map",
      enabled: true,
      order: 6,
      customHeading: "Venue Location",
    },
    {
      type: "details",
      enabled: false,
      order: 7,
    },
    {
      type: "gallery",
      enabled: false,
      order: 8,
    },
  ],

  featureFlags: {
    multiDaySchedule: true,
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
    titleTemplate: "{names} Destination Wedding",
    descriptionTemplate: "Join {names} for their destination wedding celebration",
    ogImageStyle: "travel",
  },

  customizationLevel: "curated",
};
