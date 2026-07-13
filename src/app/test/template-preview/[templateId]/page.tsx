/**
 * Test route for visual regression testing of templates
 * This route renders templates with sample data without requiring database access
 *
 * Only available in development/test environments
 */

import { notFound } from "next/navigation";
import { TEMPLATES, type TemporalData } from "@/components/templates";
import { makeSampleAsset } from "@/lib/sample-asset";
import type {
  EventPageConfigV1,
  WeddingPartyDisplayStyle,
  CouplePhotoFrameId,
} from "@/schemas/event-page";
import { heroFocalXSchema } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

// Only allow in development/test
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ templateId: string }>;
  /** `?sectionTheme=<id>` injects a section theme id for visual QA (e.g.
   *  `?sectionTheme=amethyst` on wedding_grand_luxe). `?weddingPartyStyle=<id>`
   *  injects the wedding-party display style (e.g. `?weddingPartyStyle=scrapbook`
   *  on wedding_grand_luxe). `?couplePhotoFrame=<heart|circle|full>` injects a
   *  sample couple photo with that frame shape (plus the cinematic hero fields
   *  it needs). `?backgroundTreatment=<ambience|portrait>` exercises the hero
   *  background treatment (e.g. ?backgroundTreatment=portrait on
   *  wedding_grand_luxe). `?sampleStartIn=<seconds>` injects temporal data
   *  with the event starting that many seconds from now (countdown strip QA).
   *  Dev/test only. */
  searchParams: Promise<{
    sectionTheme?: string;
    weddingPartyStyle?: string;
    couplePhotoFrame?: string;
    backgroundTreatment?: string;
    backgroundFocalX?: string;
    displayStyle?: string;
    sampleGallery?: string;
    sampleHero?: string;
    sampleParty?: string;
    sampleTitle?: string;
    sampleSubtitle?: string;
    sampleWishes?: string;
    sampleStartIn?: string;
  }>;
};

// Sample config for testing
const SAMPLE_CONFIG: EventPageConfigV1 = {
  schemaVersion: 1,
  theme: {
    preset: "modern",
    primaryColor: "#6366f1",
    fontPair: "modern",
  },
  hero: {
    title: "Sample Event Title",
    subtitle: "A beautiful celebration of togetherness",
    align: "center",
    overlay: "soft",
  },
  sections: [
    {
      type: "details",
      enabled: true,
      data: {
        dateText: "Saturday, December 14, 2024 at 4:00 PM",
        locationText: "Grand Ballroom, The Ritz Hotel, New York City",
      },
    },
    {
      type: "schedule",
      enabled: true,
      data: {
        items: [
          { time: "4:00 PM", title: "Guest Arrival", description: "Welcome drinks and mingling" },
          { time: "5:00 PM", title: "Opening Ceremony", description: "Welcome address and introductions" },
          { time: "6:00 PM", title: "Dinner Service", description: "Three-course gourmet meal" },
          { time: "8:00 PM", title: "Entertainment", description: "Live music and dancing" },
          { time: "10:00 PM", title: "Closing", description: "Final toasts and farewell" },
        ],
      },
    },
    {
      type: "faq",
      enabled: true,
      data: {
        items: [
          { q: "What is the dress code?", a: "Business casual or semi-formal attire is recommended." },
          { q: "Is parking available?", a: "Yes, complimentary valet parking is provided for all guests." },
          { q: "Can I bring a plus one?", a: "Please check your invitation for plus-one details." },
          { q: "Will there be vegetarian options?", a: "Yes, we offer vegetarian, vegan, and gluten-free options. Please let us know your dietary requirements." },
        ],
      },
    },
    {
      type: "gallery",
      enabled: true,
      data: {
        assetIds: [],
      },
    },
    {
      type: "rsvp",
      enabled: true,
      data: {
        heading: "RSVP",
        description: "Please let us know if you can make it!",
        showMaybeOption: true,
        allowPlusOnes: true,
        maxPlusOnes: 2,
        successMessage: "Thank you for your response!",
      },
    },
    {
      type: "speakers",
      enabled: true,
      data: {
        heading: "Featured Speakers",
        description: "Meet the amazing people who will be presenting at this event.",
        items: [
          {
            name: "Dr. Jane Smith",
            role: "Keynote Speaker",
            bio: "A renowned expert in technology and innovation with over 20 years of experience.",
            links: [
              { type: "twitter", url: "https://twitter.com/janesmith" },
              { type: "linkedin", url: "https://linkedin.com/in/janesmith" },
            ],
          },
          {
            name: "John Doe",
            role: "Panel Moderator",
            bio: "Award-winning journalist and thought leader in sustainable business practices.",
            links: [
              { type: "website", url: "https://johndoe.com" },
            ],
          },
          {
            name: "Emily Chen",
            role: "Workshop Leader",
            bio: "Creative director with a passion for design thinking and user experience.",
          },
        ],
      },
    },
    {
      type: "sponsors",
      enabled: true,
      data: {
        heading: "Our Sponsors",
        description: "Thank you to our generous sponsors for making this event possible.",
        showTiers: true,
        items: [
          {
            name: "TechCorp International",
            tier: "platinum",
            description: "Leading the future of technology",
            websiteUrl: "https://techcorp.example.com",
          },
          {
            name: "Innovation Labs",
            tier: "gold",
            description: "Where ideas come to life",
            websiteUrl: "https://innovationlabs.example.com",
          },
          {
            name: "Global Solutions Inc",
            tier: "gold",
            websiteUrl: "https://globalsolutions.example.com",
          },
          {
            name: "StartUp Ventures",
            tier: "silver",
          },
          {
            name: "Community Partners",
            tier: "partner",
          },
        ],
      },
    },
    {
      type: "map",
      enabled: true,
      data: {
        heading: "Find Us",
        venueName: "The Grand Convention Center",
        address: "123 Event Plaza, New York, NY 10001",
        latitude: 40.7128,
        longitude: -74.006,
        zoom: 15,
        showDirectionsLink: true,
      },
    },
    {
      type: "weddingParty",
      enabled: true,
      data: {
        heading: "The Wedding Party",
        description: "The people standing beside us.",
        members: [
          { name: "Olivia Bennett", role: "Maid of Honor", side: "bride", bio: "Best friends since freshman year." },
          { name: "Sophia Lane", role: "Bridesmaid", side: "bride" },
          { name: "James Carter", role: "Best Man", side: "groom", bio: "Brother and partner in crime." },
          { name: "Liam Walsh", role: "Groomsman", side: "groom" },
        ],
      },
    },
  ],
};

// Sample event ID for testing RSVP (non-functional in preview)
const SAMPLE_EVENT_ID = "test-event-preview";

// Empty assets for testing (no images)
const SAMPLE_ASSETS: MediaAsset[] = [];

// Sample couple-photo asset — only injected when ?couplePhotoFrame= is set so
// baseline previews stay unchanged. Curated sample photos live in
// public/test-assets/landing-samples/; in dev the supabase image loader
// returns local srcs unchanged.
const SAMPLE_COUPLE_PHOTO_ASSET = makeSampleAsset({
  id: "test-couple-photo",
  publicUrl: "/test-assets/landing-samples/couple-celebration.jpg",
  alt: "Sample couple",
  tags: ["couple"],
  width: 1067,
  height: 1600,
});

// Transparent-PNG couple silhouette for ?couplePhotoFrame=cutout — the
// cutout layout only makes visual sense with real alpha (an opaque sample
// would read as a bug). width/height feed the fill-mode hosts' intrinsic
// aspect ratio (Grand Luxe). Also injects a hero background image so the
// layering is visible.
const SAMPLE_CUTOUT_PHOTO_ASSET = makeSampleAsset({
  id: "test-couple-cutout",
  publicUrl: "/test-assets/landing-samples/couple-cutout.webp",
  alt: "Sample couple cutout",
  tags: ["couple"],
  width: 1297,
  height: 1400,
});

// Sample gallery assets for `?sampleGallery=1` — one consistent wedding shoot
// so gallery renderers (masonry, scrapbook collage) have real images to lay
// out. Baseline previews keep an empty gallery.
const SAMPLE_GALLERY_ASSETS = [
  { file: "gallery-1", width: 1067, height: 1600 },
  { file: "gallery-2", width: 1068, height: 1600 },
  { file: "gallery-3", width: 1067, height: 1600 },
  { file: "gallery-4", width: 1067, height: 1600 },
].map(({ file, width, height }) =>
  makeSampleAsset({
    id: `test-${file}`,
    publicUrl: `/test-assets/landing-samples/${file}.jpg`,
    alt: `Sample gallery photo ${file}`,
    tags: ["gallery"],
    width,
    height,
  }),
);

// Sample wedding-party portraits + members for `?sampleParty=1` — three per
// side so multi-column party renderers show a full row.
const SAMPLE_PARTY_MEMBERS = [
  { file: "party-1", name: "Olivia Bennett", role: "Maid of Honor", side: "bride" },
  { file: "party-2", name: "Sophia Lane", role: "Bridesmaid", side: "bride" },
  { file: "party-5", name: "Maya Brooks", role: "Bridesmaid", side: "bride" },
  { file: "party-3", name: "James Carter", role: "Best Man", side: "groom" },
  { file: "party-4", name: "Liam Walsh", role: "Groomsman", side: "groom" },
  { file: "party-6", name: "Noah Reed", role: "Groomsman", side: "groom" },
] as const;

const SAMPLE_PARTY_ASSETS = SAMPLE_PARTY_MEMBERS.map(({ file }) =>
  makeSampleAsset({
    id: `test-${file}`,
    publicUrl: `/test-assets/landing-samples/${file}.jpg`,
    alt: `Sample wedding party portrait ${file}`,
    tags: ["party"],
    width: 1068,
    height: 1600,
  }),
);

// Hero background choices for `?sampleHero=` — `couple` (default) is a
// golden-hour couple photo, `florals` a dark editorial flower arrangement.
const SAMPLE_HERO_BG_ASSETS: Record<string, MediaAsset> = {
  couple: makeSampleAsset({
    id: "test-hero-couple",
    publicUrl: "/test-assets/landing-samples/hero-cinematic.jpg",
    tags: ["hero"],
    width: 1067,
    height: 1600,
  }),
  florals: makeSampleAsset({
    id: "test-hero-florals",
    publicUrl: "/test-assets/landing-samples/hero-luxe.jpg",
    tags: ["hero"],
    width: 1534,
    height: 1025,
  }),
};

// Sample approved wishes for `?sampleWishes=1` — lengths span the schema's
// full range (one-liner → a 995-char letter, effectively at the manual-wish
// 1000-char cap, plus a manual-line-break "poem") so card sizing, the
// long-message clamp, and the spotlight's scroll backstop are visually
// checkable without DB rows. Rendered in "full" mode so the whole wall shows
// at once. Only wishes-capable templates (wedding_v2, V3 weddings) render
// the section.
const SAMPLE_WISHES = [
  { id: "wish-1", authorName: "Auntie Rosa", message: "Congratulations! ❤️" },
  {
    id: "wish-2",
    authorName: "The Okafor Family",
    message: "Wishing you a lifetime of love and laughter.\nWe are so happy for you both!",
  },
  {
    id: "wish-3",
    authorName: "Denise & Mark",
    message:
      "From the moment we saw you two together at the lake house, we knew this day would come. May your marriage be filled with all the right ingredients: a heap of love, a dash of humor, a touch of romance, and a spoonful of understanding.",
  },
  {
    id: "wish-4",
    authorName: "Grandpa Joe",
    message:
      "Sixty-two years ago I stood where you stand today, and if I could pass along one thing it would be this: marriage is not about finding a person you can live with, it is about finding the person you cannot imagine living without — and then proving it to them, quietly, in a thousand small ways, year after year. Bring each other coffee. Learn to lose arguments you could win. Dance in the kitchen when no one is watching. Keep choosing each other on the ordinary days, because the ordinary days are the marriage. We are so very proud of the people you have become, and prouder still of who you are when you are together. All our love, always. Your grandmother would have adored this day — she always said you two argue like people who plan to stay. Take care of the quiet things: the last slice offered first, the long drive home made short by good company, the grace to forgive quickly. And when the years pile up and the photographs fade, look at each other the way you did today. All of us do.",
  },
  {
    id: "wish-5",
    authorName: "Chidi",
    message: "Two hearts,\none home.\n\nTwo stories,\none book.\n\nTwo lives,\none love.\n\nCongratulations, my friends.",
  },
  { id: "wish-6", authorName: "Priya N.", message: "So happy for you two — see you on the dance floor! 🎉" },
  {
    id: "wish-7",
    authorName: "Coach Bell",
    message:
      "Marriage advice from the sidelines: communicate like your season depends on it, celebrate every small win, and never leave the field angry. You two are the best team I've ever seen.",
  },
  { id: "wish-8", authorName: "Nina", message: "Forever starts now. Love you both!" },
];

function resolveHeroBg(choice: string | undefined, fallback: "couple" | "florals") {
  return SAMPLE_HERO_BG_ASSETS[choice ?? ""] ?? SAMPLE_HERO_BG_ASSETS[fallback];
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  // Block in production
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_ROUTES) {
    notFound();
  }

  const { templateId } = await params;
  const {
    sectionTheme,
    weddingPartyStyle,
    couplePhotoFrame,
    backgroundTreatment,
    backgroundFocalX,
    displayStyle,
    sampleGallery,
    sampleHero,
    sampleParty,
    sampleTitle,
    sampleSubtitle,
    sampleWishes,
    sampleStartIn,
  } = await searchParams;

  // Verify template exists
  if (!(templateId in TEMPLATES)) {
    notFound();
  }

  const Template = TEMPLATES[templateId];

  // Optionally exercise a section theme (e.g. ?sectionTheme=amethyst).
  let config: EventPageConfigV1 = sectionTheme
    ? { ...SAMPLE_CONFIG, theme: { ...SAMPLE_CONFIG.theme, sectionThemeId: sectionTheme } }
    : SAMPLE_CONFIG;

  // Optionally override the hero title/subtitle (?sampleTitle=&sampleSubtitle=)
  // so non-wedding templates can be previewed with copy that fits them.
  if (sampleTitle || sampleSubtitle) {
    config = {
      ...config,
      hero: {
        ...config.hero,
        ...(sampleTitle ? { title: sampleTitle } : {}),
        ...(sampleSubtitle ? { subtitle: sampleSubtitle } : {}),
      },
    };
  }

  // Optionally exercise the wedding-party display style (e.g.
  // ?weddingPartyStyle=scrapbook on wedding_grand_luxe).
  if (weddingPartyStyle) {
    config = {
      ...config,
      sections: config.sections.map((s) =>
        s.type === "weddingParty"
          ? { ...s, data: { ...s.data, displayStyle: weddingPartyStyle as WeddingPartyDisplayStyle } }
          : s,
      ),
    };
  }

  // Optionally exercise a couple-photo frame shape (e.g.
  // ?couplePhotoFrame=full on wedding_grand_luxe). Injects the sample couple
  // photo plus the cinematic hero fields the V2 hero needs to show it.
  let assets = SAMPLE_ASSETS;
  if (couplePhotoFrame) {
    // Cutout gets the transparent silhouette + a hero background (the
    // layered composition is the whole point); other frames keep the
    // opaque sample photo.
    const coupleAsset =
      couplePhotoFrame === "cutout"
        ? SAMPLE_CUTOUT_PHOTO_ASSET
        : SAMPLE_COUPLE_PHOTO_ASSET;
    // Cutout defaults to the dark-floral backdrop — the layered composition is
    // most legible against it; `?sampleHero=` still overrides.
    const cutoutHeroBg = resolveHeroBg(sampleHero, "florals");
    assets =
      couplePhotoFrame === "cutout"
        ? [coupleAsset, cutoutHeroBg]
        : [coupleAsset];
    config = {
      ...config,
      hero: {
        ...config.hero,
        style: "cinematic",
        coupleNames: "Avery & Jordan",
        couplePhotoAssetId: coupleAsset.id,
        couplePhotoFrame: couplePhotoFrame as CouplePhotoFrameId,
        ...(couplePhotoFrame === "cutout"
          ? { heroImageAssetId: cutoutHeroBg.id }
          : {}),
      },
    };
  }

  // Optionally exercise the hero background treatment (e.g.
  // ?backgroundTreatment=portrait on wedding_grand_luxe).
  if (backgroundTreatment === "ambience" || backgroundTreatment === "portrait") {
    config = {
      ...config,
      hero: { ...config.hero, backgroundTreatment },
    };
  }

  // Optionally exercise the hero focal anchor (?backgroundFocalX= any
  // heroFocalXSchema value — compose with ?sampleHero= for a hero image, and
  // with ?backgroundTreatment=portrait to verify the edges → center
  // normalization). Validated against the schema itself so a future enum
  // value is exercisable here the day it lands.
  const focal = heroFocalXSchema.safeParse(backgroundFocalX);
  if (focal.success) {
    config = {
      ...config,
      hero: { ...config.hero, backgroundFocalX: focal.data },
    };
  }

  // Optionally inject a hero background photo + cinematic hero fields
  // (?sampleHero=couple|florals). Composes with non-cutout couple frames;
  // the cutout branch above already injected its own backdrop (and portrait
  // treatment suppresses the floating photo, so the pairing stays coherent).
  if (sampleHero && couplePhotoFrame !== "cutout") {
    const heroBg = resolveHeroBg(sampleHero, "couple");
    assets = [...assets, heroBg];
    config = {
      ...config,
      hero: {
        ...config.hero,
        style: "cinematic",
        coupleNames: "Avery & Jordan",
        heroImageAssetId: heroBg.id,
      },
    };
  }

  // Optionally swap in a fuller wedding party with portrait photos so the
  // party renderers (polaroid, gilded, cinematic) have real faces and full
  // rows (?sampleParty=1).
  if (sampleParty) {
    assets = [...assets, ...SAMPLE_PARTY_ASSETS];
    config = {
      ...config,
      sections: config.sections.map((s) =>
        s.type === "weddingParty"
          ? {
              ...s,
              data: {
                ...s.data,
                members: SAMPLE_PARTY_MEMBERS.map(({ file, name, role, side }) => ({
                  name,
                  role,
                  side,
                  imageAssetId: `test-${file}`,
                })),
              },
            }
          : s,
      ),
    };
  }

  // Optionally exercise a theme display style (e.g. ?displayStyle=scrapbook on
  // wedding_v2 renders the Scrapbook Edition chrome + renderers).
  if (displayStyle === "scrapbook" || displayStyle === "standard") {
    config = {
      ...config,
      theme: { ...config.theme, displayStyle },
    };
  }

  // Optionally populate the gallery section with sample photos so gallery
  // renderers have real images to lay out (?sampleGallery=1).
  if (sampleGallery) {
    assets = [...assets, ...SAMPLE_GALLERY_ASSETS];
    config = {
      ...config,
      sections: config.sections.map((s) =>
        s.type === "gallery"
          ? { ...s, data: { ...s.data, assetIds: SAMPLE_GALLERY_ASSETS.map((a) => a.id) } }
          : s,
      ),
    };
  }

  // Optionally append an enabled wishes section fed with the sample wishes
  // (?sampleWishes=1). "full" mode renders the whole wall (no preview slice).
  if (sampleWishes) {
    config = {
      ...config,
      sections: [
        ...config.sections,
        {
          type: "wishes",
          enabled: true,
          data: {
            heading: "Wedding Wishes",
            intro: "A few words from the people we love.",
            previewCount: 3,
            enableSubmissions: true,
          },
        },
      ],
    };
  }

  // Optionally exercise the temporal strip (?sampleStartIn=<seconds until
  // start> — e.g. ?sampleStartIn=90 watches minutes → seconds → confetti →
  // "Happening Now"; negative values land mid-event or, below -14400, past
  // the 4-hour sample end). Dev/test only.
  let temporal: TemporalData | undefined;
  if (sampleStartIn !== undefined) {
    const seconds = Number(sampleStartIn);
    if (Number.isFinite(seconds)) {
      // eslint-disable-next-line react-hooks/purity -- dev-only force-dynamic QA route; the point is anchoring the sample event relative to request time
      const startMs = Date.now() + seconds * 1000;
      temporal = {
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(startMs + 4 * 60 * 60 * 1000).toISOString(),
        timezone: "UTC",
        rsvpDeadline: null,
      };
    }
  }

  return (
    <Template
      config={config}
      assets={assets}
      eventId={SAMPLE_EVENT_ID}
      approvedWishes={sampleWishes ? SAMPLE_WISHES : undefined}
      wishesMode="full"
      temporal={temporal}
    />
  );
}
