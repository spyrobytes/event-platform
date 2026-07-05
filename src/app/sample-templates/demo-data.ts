import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import type { TemporalData } from "@/components/templates";
import {
  V2_SECTION_THEMES,
  V2_DEFAULT_SECTION_THEME,
} from "@/components/templates/wedding-v2/section-themes";
import { getV3Definition } from "@/components/templates/wedding-v3";

/**
 * Sample data for the public /sample-templates/* demo pages.
 *
 * Each demo renders a real template component (the same code path as
 * /e/[slug]) against a curated config + asset set — no database. Assets live
 * in public/landing/template-demos/ (resized copies of
 * docs/landing-page/asset-samples/, prepared for landing/marketing use).
 */

/** Theme swatch shown in the demo bar. `id: null` is the template default. */
export type DemoThemeOption = {
  id: string | null;
  label: string;
  swatch: string;
};

export type TemplateDemo = {
  slug: string;
  templateId: "wedding_v2" | "wedding_grand_luxe" | "wedding_celebration";
  /** Display name, matches the landing showcase plate caption. */
  name: string;
  /** Meta description / demo-bar strapline. */
  tagline: string;
  /** OG image — reuses the landing showcase capture. */
  ogImage: string;
  config: EventPageConfigV1;
  assets: MediaAsset[];
  /** Section color themes (empty = template has no color variants). */
  themes: DemoThemeOption[];
  /**
   * Optional per-theme hero background override (theme id → asset id).
   * Grand Luxe pairs each section theme with a hue-matched floral backdrop.
   * Key "" is the default (no theme selected).
   */
  themeHeroAssetIds?: Record<string, string>;
  temporal: TemporalData;
};

// All sample assets share this shape; the cast is confined here (same
// pattern as /test/template-preview). `width`/`height` feed fill-mode hosts
// that derive intrinsic aspect ratios; `renditionWidths: []` keeps
// buildRenditionSrcSet on its no-renditions path, so the local /public srcs
// ship as-is.
function makeSampleAsset(asset: {
  id: string;
  publicUrl: string;
  alt: string;
  tags?: string[];
  width: number;
  height: number;
}): MediaAsset {
  return {
    tags: [],
    blurDataUrl: null,
    renditionWidths: [],
    ...asset,
  } as unknown as MediaAsset;
}

const DEMO_ASSET_BASE = "/landing/template-demos";

// ---------------------------------------------------------------------------
// № 01 — Wedding Cinematic (wedding_v2)
// Golden-hour shoot: veil-lit hero + matching gallery, curated party set.
// ---------------------------------------------------------------------------

const CINEMATIC_GALLERY = [
  { id: "demo-cin-gal-1", file: "gallery/cin-1.jpg", width: 800, height: 1200 },
  { id: "demo-cin-gal-2", file: "gallery/cin-2.jpg", width: 801, height: 1200 },
  { id: "demo-cin-gal-3", file: "gallery/cin-3.jpg", width: 800, height: 1200 },
  { id: "demo-cin-gal-4", file: "gallery/cin-4.jpg", width: 801, height: 1200 },
  { id: "demo-cin-gal-5", file: "gallery/cin-5.jpg", width: 800, height: 1200 },
];

const CINEMATIC_PARTY = [
  { id: "demo-cin-party-1", file: "party/cin-1.jpg", name: "Olivia Bennett", role: "Maid of Honor", side: "bride", bio: "Best friends since freshman year." },
  { id: "demo-cin-party-2", file: "party/cin-2.jpg", name: "Sophia Lane", role: "Bridesmaid", side: "bride" },
  { id: "demo-cin-party-3", file: "party/cin-3.jpg", name: "Maya Brooks", role: "Bridesmaid", side: "bride" },
  { id: "demo-cin-party-4", file: "party/cin-4.jpg", name: "James Carter", role: "Best Man", side: "groom", bio: "Brother and partner in crime." },
  { id: "demo-cin-party-5", file: "party/cin-5.jpg", name: "Liam Walsh", role: "Groomsman", side: "groom" },
  { id: "demo-cin-party-6", file: "party/cin-6.jpg", name: "Noah Reed", role: "Groomsman", side: "groom" },
] as const;

const cinematicAssets: MediaAsset[] = [
  makeSampleAsset({
    id: "demo-cin-hero",
    publicUrl: `${DEMO_ASSET_BASE}/hero/cinematic-hero.jpg`,
    alt: "Bride and groom under a sunlit veil at golden hour",
    tags: ["hero"],
    width: 1067,
    height: 1600,
  }),
  ...CINEMATIC_GALLERY.map((g, i) =>
    makeSampleAsset({
      id: g.id,
      publicUrl: `${DEMO_ASSET_BASE}/${g.file}`,
      alt: `Golden-hour wedding photo ${i + 1}`,
      tags: ["gallery"],
      width: g.width,
      height: g.height,
    }),
  ),
  ...CINEMATIC_PARTY.map((m) =>
    makeSampleAsset({
      id: m.id,
      publicUrl: `${DEMO_ASSET_BASE}/${m.file}`,
      alt: `Portrait of ${m.name}`,
      tags: ["party"],
      width: 1068,
      height: 1600,
    }),
  ),
];

const cinematicConfig: EventPageConfigV1 = {
  schemaVersion: 1,
  theme: {
    preset: "classic",
    primaryColor: "#7a8c72",
    fontPair: "serif_sans",
  },
  hero: {
    title: "Avery & Jordan",
    subtitle: "Saturday, September 19th, 2026 · Napa Valley",
    align: "center",
    overlay: "soft",
    style: "cinematic",
    showCountdown: true,
    showScheduleCards: true,
    coupleNames: "Avery & Jordan",
    monogram: "A&J",
    heroImageAssetId: "demo-cin-hero",
  },
  sections: [
    {
      type: "story",
      enabled: true,
      data: {
        heading: "Our Story",
        content:
          "From a chance encounter at a bookshop in Paris to building a life together across two continents, our journey has been nothing short of extraordinary. We found in each other a partner, a best friend, and a home.",
        layout: "timeline",
        milestones: [
          { year: "2019", title: "First Meeting", description: "A rainy afternoon at Shakespeare and Company bookshop" },
          { year: "2021", title: "First Adventure", description: "A spontaneous road trip through the French countryside" },
          { year: "2023", title: "Moving In", description: "Our first apartment with a tiny balcony and big dreams" },
          { year: "2025", title: "The Proposal", description: "Under the old oak tree where we had our first picnic" },
        ],
      },
    },
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "September 19th, 2026",
        locationText: "The Grand Estate, Napa Valley, California",
        venueDescription: "A hilltop venue surrounded by vineyards and oak groves",
        events: [
          { name: "Wedding Ceremony", date: "2:00 PM", location: "The Garden Terrace" },
          { name: "Cocktail Hour", date: "3:30 PM", location: "The Vineyard Patio" },
          { name: "Reception & Dinner", date: "5:00 PM", location: "The Grand Ballroom" },
        ],
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        heading: "Wedding Weekend",
        items: [],
        groups: [
          {
            label: "Friday",
            date: "September 18",
            items: [
              { time: "6:00 PM", title: "Welcome Dinner", description: "Casual gathering at the vineyard" },
            ],
          },
          {
            label: "Saturday",
            date: "September 19",
            items: [
              { time: "2:00 PM", title: "Ceremony", description: "Garden terrace" },
              { time: "3:30 PM", title: "Cocktails", description: "Vineyard patio" },
              { time: "5:00 PM", title: "Reception", description: "Grand ballroom" },
            ],
          },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        heading: "Our Moments",
        displayMode: "masonry",
        showCaptions: false,
        assetIds: CINEMATIC_GALLERY.map((g) => g.id),
      },
    },
    {
      type: "weddingParty",
      enabled: true,
      data: {
        heading: "The Wedding Party",
        description: "The people standing beside us.",
        members: CINEMATIC_PARTY.map(({ id, name, role, side, ...rest }) => ({
          name,
          role,
          side,
          imageAssetId: id,
          ...("bio" in rest ? { bio: rest.bio } : {}),
        })),
      },
    },
    {
      type: "faq",
      enabled: true,
      data: {
        heading: "Questions & Answers",
        items: [
          { q: "What should I wear?", a: "We encourage formal attire. Think elegant and comfortable for an evening of celebration." },
          { q: "Can I bring a plus one?", a: "Please refer to your invitation for details regarding additional guests." },
          { q: "Is there parking available?", a: "Yes, complimentary valet parking will be available at the venue entrance." },
        ],
      },
    },
    {
      type: "rsvp",
      enabled: true,
      data: {
        heading: "RSVP",
        description: "We can't wait to celebrate with you.",
        showMaybeOption: true,
        allowPlusOnes: true,
        maxPlusOnes: 1,
      },
    },
  ],
  chrome: {
    topbar: true,
    scrollProgress: true,
  },
};

// ---------------------------------------------------------------------------
// № 02 — The Grand Luxe (wedding_grand_luxe)
// Cutout couple over dark florals, gilded party portraits, editorial gallery.
// ---------------------------------------------------------------------------

const LUXE_FLORAL_HEROES = [
  { id: "demo-lux-floral-dark", file: "hero/floral-dark.jpg", alt: "Dark floral arrangement on a charcoal backdrop" },
  { id: "demo-lux-floral-blue", file: "hero/floral-blue.jpg", alt: "Dark floral arrangement on a midnight-blue backdrop" },
  { id: "demo-lux-floral-green", file: "hero/floral-green.jpg", alt: "Dark floral arrangement on a deep-green backdrop" },
  { id: "demo-lux-floral-purple", file: "hero/floral-purple.jpg", alt: "Dark floral arrangement on a deep-purple backdrop" },
];

const LUXE_GALLERY = [
  { id: "demo-lux-gal-1", file: "gallery/lux-1.jpg", width: 960, height: 1200 },
  { id: "demo-lux-gal-2", file: "gallery/lux-2.jpg", width: 675, height: 1200 },
  { id: "demo-lux-gal-3", file: "gallery/lux-3.jpg", width: 800, height: 1200 },
  { id: "demo-lux-gal-4", file: "gallery/lux-4.jpg", width: 800, height: 1200 },
  { id: "demo-lux-gal-5", file: "gallery/lux-5.jpg", width: 800, height: 1200 },
];

const LUXE_PARTY = [
  { id: "demo-lux-party-b1", file: "party/lux-b1.jpg", width: 534, name: "Zuri Okafor", role: "Maid of Honor", side: "bride", bio: "Sisters in everything but blood." },
  { id: "demo-lux-party-b2", file: "party/lux-b2.jpg", width: 532, name: "Adaeze Nwosu", role: "Bridesmaid", side: "bride" },
  { id: "demo-lux-party-b3", file: "party/lux-b3.jpg", width: 533, name: "Chidinma Eze", role: "Bridesmaid", side: "bride" },
  { id: "demo-lux-party-g1", file: "party/lux-g1.jpg", width: 534, name: "Emeka Obi", role: "Best Man", side: "groom", bio: "Brothers since the first day of school." },
  { id: "demo-lux-party-g2", file: "party/lux-g2.jpg", width: 533, name: "Kelechi Ade", role: "Groomsman", side: "groom" },
  { id: "demo-lux-party-g3", file: "party/lux-g3.jpg", width: 533, name: "Tunde Bello", role: "Groomsman", side: "groom" },
] as const;

const luxeAssets: MediaAsset[] = [
  makeSampleAsset({
    id: "demo-lux-cutout",
    publicUrl: `${DEMO_ASSET_BASE}/couple/cutout.webp`,
    alt: "Couple portrait with transparent background",
    tags: ["couple"],
    width: 1297,
    height: 1400,
  }),
  ...LUXE_FLORAL_HEROES.map((h) =>
    makeSampleAsset({
      id: h.id,
      publicUrl: `${DEMO_ASSET_BASE}/${h.file}`,
      alt: h.alt,
      tags: ["hero"],
      width: 1534,
      height: 1025,
    }),
  ),
  ...LUXE_GALLERY.map((g, i) =>
    makeSampleAsset({
      id: g.id,
      publicUrl: `${DEMO_ASSET_BASE}/${g.file}`,
      alt: `Editorial couple photo ${i + 1}`,
      tags: ["gallery"],
      width: g.width,
      height: g.height,
    }),
  ),
  ...LUXE_PARTY.map((m) =>
    makeSampleAsset({
      id: m.id,
      publicUrl: `${DEMO_ASSET_BASE}/${m.file}`,
      alt: `Portrait of ${m.name}`,
      tags: ["party"],
      width: m.width,
      height: 800,
    }),
  ),
];

const luxeConfig: EventPageConfigV1 = {
  schemaVersion: 1,
  theme: {
    preset: "classic",
    primaryColor: "#c5a55a",
    fontPair: "serif_sans",
  },
  hero: {
    title: "Amara & David",
    subtitle: "Saturday, October 10th, 2026 · Lagos",
    align: "center",
    overlay: "soft",
    style: "cinematic",
    showCountdown: true,
    coupleNames: "Amara & David",
    monogram: "A&D",
    couplePhotoAssetId: "demo-lux-cutout",
    couplePhotoFrame: "cutout",
    heroImageAssetId: "demo-lux-floral-dark",
  },
  sections: [
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "October 10th, 2026",
        locationText: "The Monarch Event Centre, Lagos",
        venueDescription: "An evening of gold, candlelight, and highlife",
        events: [
          { name: "Ceremony", date: "3:00 PM", location: "The Grand Hall" },
          { name: "Cocktail Reception", date: "5:00 PM", location: "The Terrace" },
          { name: "Dinner & Dancing", date: "7:00 PM", location: "The Monarch Ballroom" },
        ],
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        heading: "The Celebration",
        items: [
          { time: "3:00 PM", title: "Ceremony", description: "The Grand Hall" },
          { time: "5:00 PM", title: "Cocktails", description: "Golden hour on the terrace" },
          { time: "7:00 PM", title: "Dinner", description: "A five-course celebration" },
          { time: "9:00 PM", title: "Dancing", description: "Live band until late" },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        heading: "The Two of Us",
        showCaptions: false,
        assetIds: LUXE_GALLERY.map((g) => g.id),
      },
    },
    {
      type: "weddingParty",
      enabled: true,
      data: {
        heading: "The Wedding Party",
        description: "Our nearest and dearest.",
        members: LUXE_PARTY.map(({ id, name, role, side, ...rest }) => ({
          name,
          role,
          side,
          imageAssetId: id,
          ...("bio" in rest ? { bio: rest.bio } : {}),
        })),
      },
    },
    {
      type: "faq",
      enabled: true,
      data: {
        heading: "Questions & Answers",
        items: [
          { q: "What is the dress code?", a: "Black tie — bring your gold accents. Traditional attire is warmly welcomed." },
          { q: "Can I bring a plus one?", a: "Please refer to your invitation for details regarding additional guests." },
          { q: "Is there parking available?", a: "Yes, valet parking is provided at the venue entrance." },
        ],
      },
    },
    {
      type: "rsvp",
      enabled: true,
      data: {
        heading: "RSVP",
        description: "Join us for an unforgettable evening.",
        showMaybeOption: true,
        allowPlusOnes: true,
        maxPlusOnes: 1,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// № 03 — Celebration (wedding_celebration)
// Warm champagne light: golden-hour engagement shoot.
// ---------------------------------------------------------------------------

const CELEBRATION_GALLERY = [
  { id: "demo-cel-gal-1", file: "gallery/cel-1.jpg", width: 800, height: 1200 },
  { id: "demo-cel-gal-2", file: "gallery/cel-2.jpg", width: 868, height: 1200 },
  { id: "demo-cel-gal-3", file: "gallery/cel-3.jpg", width: 800, height: 1200 },
  { id: "demo-cel-gal-4", file: "gallery/cel-4.jpg", width: 960, height: 1200 },
  { id: "demo-cel-gal-5", file: "gallery/cel-5.jpg", width: 800, height: 1200 },
  { id: "demo-cel-gal-6", file: "gallery/cel-6.jpg", width: 1200, height: 801 },
];

const CELEBRATION_PARTY = [
  { id: "demo-cel-party-b1", file: "party/cel-b1.jpg", name: "Isabella Reyes", role: "Maid of Honor", side: "bride", bio: "Roommates turned lifelong friends." },
  { id: "demo-cel-party-b2", file: "party/cel-b2.jpg", name: "Camila Torres", role: "Bridesmaid", side: "bride" },
  { id: "demo-cel-party-b3", file: "party/cel-b3.jpg", name: "Lucia Vega", role: "Bridesmaid", side: "bride" },
  { id: "demo-cel-party-g1", file: "party/cel-g1.jpg", name: "Diego Morales", role: "Best Man", side: "groom", bio: "Cousin, confidant, chaos coordinator." },
  { id: "demo-cel-party-g2", file: "party/cel-g2.jpg", name: "Andres Silva", role: "Groomsman", side: "groom" },
  { id: "demo-cel-party-g3", file: "party/cel-g3.jpg", name: "Rafael Cruz", role: "Groomsman", side: "groom" },
] as const;

const celebrationAssets: MediaAsset[] = [
  makeSampleAsset({
    id: "demo-cel-hero",
    publicUrl: `${DEMO_ASSET_BASE}/couple/celebration-hero.jpg`,
    alt: "Couple embracing in warm golden-hour light",
    tags: ["hero"],
    width: 1067,
    height: 1600,
  }),
  ...CELEBRATION_GALLERY.map((g, i) =>
    makeSampleAsset({
      id: g.id,
      publicUrl: `${DEMO_ASSET_BASE}/${g.file}`,
      alt: `Golden-hour engagement photo ${i + 1}`,
      tags: ["gallery"],
      width: g.width,
      height: g.height,
    }),
  ),
  ...CELEBRATION_PARTY.map((m) =>
    makeSampleAsset({
      id: m.id,
      publicUrl: `${DEMO_ASSET_BASE}/${m.file}`,
      alt: `Portrait of ${m.name}`,
      tags: ["party"],
      width: 533,
      height: 800,
    }),
  ),
];

const celebrationConfig: EventPageConfigV1 = {
  schemaVersion: 1,
  theme: {
    preset: "classic",
    primaryColor: "#c48820",
    fontPair: "serif_sans",
  },
  hero: {
    title: "Sofia & Mateo",
    subtitle: "Saturday, November 7th, 2026 · Tulum",
    align: "center",
    overlay: "soft",
    showCountdown: true,
    coupleNames: "Sofia & Mateo",
    heroImageAssetId: "demo-cel-hero",
  },
  sections: [
    {
      type: "story",
      enabled: true,
      data: {
        heading: "How We Got Here",
        content:
          "We met at a friend's beach bonfire, argued about the best taco spot in town, and have been settling that argument together ever since. Now we're throwing the biggest party of our lives — and you're invited.",
        layout: "timeline",
        milestones: [
          { year: "2020", title: "The Bonfire", description: "A debate about tacos that never really ended" },
          { year: "2022", title: "The Big Move", description: "One apartment, two bikes, and a very opinionated cat" },
          { year: "2025", title: "The Yes", description: "Sunrise on the beach where it all started" },
        ],
      },
    },
    {
      type: "weddingParty",
      enabled: true,
      data: {
        heading: "The Crew",
        description: "The friends and family celebrating with us.",
        members: CELEBRATION_PARTY.map(({ id, name, role, side, ...rest }) => ({
          name,
          role,
          side,
          imageAssetId: id,
          ...("bio" in rest ? { bio: rest.bio } : {}),
        })),
      },
    },
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "November 7th, 2026",
        locationText: "Casa Maya, Tulum, Mexico",
        venueDescription: "Barefoot ceremony, champagne sunset, dancing under the palms",
        events: [
          { name: "Beach Ceremony", date: "4:30 PM", location: "The Shoreline" },
          { name: "Sunset Cocktails", date: "5:30 PM", location: "The Palapa Bar" },
          { name: "Dinner & Party", date: "7:00 PM", location: "Casa Maya Gardens" },
        ],
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        heading: "The Big Day",
        items: [
          { time: "4:30 PM", title: "Ceremony", description: "On the sand — shoes optional" },
          { time: "5:30 PM", title: "Cocktails", description: "Champagne at sunset" },
          { time: "7:00 PM", title: "Dinner", description: "Long tables under string lights" },
          { time: "9:00 PM", title: "Dancing", description: "Until the stars come out" },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        heading: "Us, So Far",
        showCaptions: false,
        assetIds: CELEBRATION_GALLERY.map((g) => g.id),
      },
    },
    {
      type: "rsvp",
      enabled: true,
      data: {
        heading: "RSVP",
        description: "Come celebrate with us — we're saving you a seat.",
        showMaybeOption: true,
        allowPlusOnes: true,
        maxPlusOnes: 1,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** Grand Luxe swatches come from its TemplateDefinition so the demo bar and
 *  the dashboard picker can never drift apart. */
function grandLuxeThemes(): DemoThemeOption[] {
  const def = getV3Definition("wedding_grand_luxe");
  if (!def?.sectionThemes) return [];
  const defaults = def.defaultSectionTheme
    ? [{ id: null, label: def.defaultSectionTheme.label, swatch: def.defaultSectionTheme.swatch }]
    : [];
  return [
    ...defaults,
    ...def.sectionThemes.map((t) => ({ id: t.id, label: t.label, swatch: t.panel })),
  ];
}

export const TEMPLATE_DEMOS: TemplateDemo[] = [
  {
    slug: "cinematic",
    templateId: "wedding_v2",
    name: "Wedding Cinematic",
    tagline:
      "A slow-reveal, film-title wedding page with countdown, story timeline, gallery, and RSVP — see the full template live.",
    ogImage: "/landing/templates/cinematic.jpg",
    config: cinematicConfig,
    assets: cinematicAssets,
    themes: [
      { id: null, label: V2_DEFAULT_SECTION_THEME.label, swatch: V2_DEFAULT_SECTION_THEME.swatch },
      ...V2_SECTION_THEMES.map((t) => ({ id: t.id, label: t.label, swatch: t.panel })),
    ],
    temporal: {
      startAt: "2026-09-19T21:00:00.000Z",
      endAt: "2026-09-20T05:00:00.000Z",
      timezone: "America/Los_Angeles",
      rsvpDeadline: "2026-08-19T07:00:00.000Z",
    },
  },
  {
    slug: "grand-luxe",
    templateId: "wedding_grand_luxe",
    name: "The Grand Luxe",
    tagline:
      "Cutout couple portraits over dark florals with gilded details — explore the full template with live color themes.",
    ogImage: "/landing/templates/grand-luxe.jpg",
    config: luxeConfig,
    assets: luxeAssets,
    themes: grandLuxeThemes(),
    // Hue-matched floral backdrops per section theme; "" = default (Light).
    themeHeroAssetIds: {
      "": "demo-lux-floral-dark",
      "midnight-slate": "demo-lux-floral-blue",
      amethyst: "demo-lux-floral-purple",
      "emerald-noir": "demo-lux-floral-green",
      cerulean: "demo-lux-floral-blue",
    },
    temporal: {
      startAt: "2026-10-10T14:00:00.000Z",
      endAt: "2026-10-10T23:00:00.000Z",
      timezone: "Africa/Lagos",
      rsvpDeadline: "2026-09-10T22:00:00.000Z",
    },
  },
  {
    slug: "celebration",
    templateId: "wedding_celebration",
    name: "Celebration",
    tagline:
      "Warm champagne light for parties of every kind — story, crew, schedule, and gallery in one joyful page.",
    ogImage: "/landing/templates/celebration.jpg",
    config: celebrationConfig,
    assets: celebrationAssets,
    themes: [],
    temporal: {
      startAt: "2026-11-07T22:30:00.000Z",
      endAt: "2026-11-08T06:00:00.000Z",
      timezone: "America/Cancun",
      rsvpDeadline: "2026-10-07T05:00:00.000Z",
    },
  },
];

export function getTemplateDemo(slug: string): TemplateDemo | undefined {
  return TEMPLATE_DEMOS.find((d) => d.slug === slug);
}
