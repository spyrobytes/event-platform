/**
 * Test route for visual QA of animated invitation templates.
 * Renders data-driven invitation templates with sample data without
 * requiring database access — mirrors the rendering in /invite/[token].
 *
 * Only available in development/test environments.
 *
 * `?preset=baseline|long|max` picks the content preset (`max` fills every
 * field at its schema limit — the overflow worst case). `?headerMode=`
 * overrides the header mode (`max` defaults to traditional, the tallest
 * header). `?theme=<id>` picks the invitation theme. `?open=1` renders the
 * card already revealed so the open-state content can be inspected without
 * clicking through the animation.
 */

import { notFound } from "next/navigation";
import {
  InvitationShell,
  SplitRevealCard,
  SplitRevealCardV2,
  GoldenCardReveal,
  FlipFlapReveal,
  WeddingStorybook,
} from "@/components/features/Invitation";
import { THEME_IDS, type ThemeId } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{
    preset?: string;
    headerMode?: string;
    theme?: string;
    open?: string;
  }>;
};

const SUPPORTED_TEMPLATES = [
  "SPLIT_REVEAL",
  "SPLIT_REVEAL_V2",
  "GOLDEN_CARD_REVEAL",
  "FLIP_FLAP_REVEAL",
  "WEDDING_STORYBOOK",
] as const;

type SupportedTemplateId = (typeof SUPPORTED_TEMPLATES)[number];

const BASE_DATA: InvitationData = {
  coupleNames: "Avery & Jordan",
  eventTitle: "Avery & Jordan's Wedding",
  eventDate: new Date("2026-08-15T20:00:00Z"),
  eventTime: "4:00 PM",
  timezone: "America/Toronto",
  venue: {
    name: "The Rosewood Estate",
    address: "48 Garden Lane",
    city: "Toronto",
  },
  rsvpUrl: "#rsvp",
  person1Name: "Avery",
  person2Name: "Jordan",
  ceremonyDate: "Saturday, August 15, 2026",
  ceremonyTime: "4:00 PM",
  ceremonyVenue: "The Rosewood Estate",
  ceremonyAddress: "48 Garden Lane, Toronto",
  rsvpDeadline: "July 15, 2026",
};

/** Long-but-plausible content — over the recommended lengths, under max. */
const LONG_DATA: Partial<InvitationData> = {
  coupleNames: "Alexandrina-Wilhelmina & Bartholomew-Christopher",
  person1Name: "Alexandrina-Wilhelmina Rosalind",
  person2Name: "Bartholomew-Christopher Nathaniel",
  inviteeName: "Dr. Genevieve Featherstone-Smythe",
  dressCode: "Formal — Black Tie Optional",
  customMessage:
    "We would be honoured to celebrate this joyous occasion with you and your family as we begin our new life together.",
  venue: {
    name: "The Grand Conservatory at Willowbrook",
    address: "1284 Distillery Heritage District Boulevard",
    city: "Niagara-on-the-Lake",
  },
  ceremonyVenue: "The Grand Conservatory at Willowbrook",
  ceremonyAddress: "1284 Distillery Heritage District Boulevard, Niagara-on-the-Lake",
  receptionDate: "Saturday, August 15, 2026",
  receptionTime: "7:00 PM",
  receptionVenue: "The Willowbrook Grand Ballroom",
  receptionAddress: "1284 Distillery Heritage District Boulevard, Niagara-on-the-Lake",
};

/** Every field at (or near) its CONTENT_LIMITS max — the clipping worst case. */
const MAX_DATA: Partial<InvitationData> = {
  // 60 chars (coupleDisplayName max)
  coupleNames: "Maria Guadalupe de los Ángeles & Christopher Montgomery III",
  // 50 chars each (personName max)
  person1Name: "Maria Guadalupe Fernanda de los Ángeles Rodríguez",
  person2Name: "Christopher Alexander Montgomery-Featherstonehaugh",
  // 40 chars (inviteeDisplayName max)
  inviteeName: "Dr. Bartholomew Featherstone-Smythe III",
  // 60 chars (headerText max)
  headerText: "Together with their families, joyfully request your presence",
  headerMode: "traditional",
  // 80 chars each (familyName max)
  person1FamilyName: "The Rodríguez-Villalobos Family of San Miguel de Allende and Mexico City, D.F.",
  person2FamilyName: "The Montgomery-Featherstonehaugh Family of Edinburgh, Scotland, United Kingdom",
  // 120 chars (familyInviteText max)
  familyInviteText:
    "together with their beloved parents and grandparents, joyfully request the honour of your presence at the marriage of",
  // 80 chars (eventTypeText max)
  eventTypeText: "as they celebrate the sacrament of holy matrimony and the union of two families",
  monogram: "MG·CM",
  // 30 chars (dressCode max)
  dressCode: "Strictly Formal Black Tie Only",
  // 200 chars (customMessage max)
  customMessage:
    "We are overjoyed to invite you to share in the happiness of our wedding day. Your presence would mean the world to us both as we exchange vows surrounded by everyone we love most dearly in this world.",
  venue: {
    // 50 chars (venueName max)
    name: "The Grand Ballroom at the Fairmont Château Whist",
    // 100 chars (address max)
    address: "1 Rideau Street, Grand Ballroom Level, Suite 400, near the Parliament Buildings ceremonial gateway",
    city: "Ottawa",
    state: "Ontario",
    zipCode: "K1N 8S7",
  },
  ceremonyDate: "Saturday, the Fifteenth of August, Two Thousand Twenty-Six",
  ceremonyTime: "Four o'clock in the afternoon",
  ceremonyVenue: "The Grand Ballroom at the Fairmont Château Whist",
  ceremonyAddress: "1 Rideau Street, Grand Ballroom Level, Suite 400, near the Parliament Buildings ceremonial gateway",
  receptionDate: "Saturday, the Fifteenth of August, Two Thousand Twenty-Six",
  receptionTime: "Seven o'clock in the evening",
  receptionVenue: "The Fairmont Château Whist Conservatory Terrace",
  receptionAddress: "1 Rideau Street, Conservatory Level, Ottawa, Ontario, overlooking the Rideau Canal locks below",
  rsvpDeadline: "Wednesday, July 15, 2026",
  // Storybook extended content
  storyHeading: "How We Met — A Story Twelve Wonderful Years in the Making",
  storyParagraphs: [
    "We first crossed paths in the reading room of a small university library, both reaching for the same battered copy of Neruda's collected poems. Neither of us let go, and in fairness, neither of us has since.",
    "Twelve years, four cities, two graduate degrees, and one very opinionated golden retriever later, we are finally making it official in front of everyone who carried us here.",
  ],
  timeline: [
    { date: "September 2014", label: "A shared book in the university library", description: "Two hands on one Neruda anthology. We negotiated joint custody over coffee, and the negotiation simply never ended." },
    { date: "June 2017", label: "The move across the country together", description: "Everything we owned fit into one hatchback. The dog got the front seat, obviously, and navigated us wrong twice." },
    { date: "December 2023", label: "A proposal on the winter solstice", description: "On the longest night of the year, under every string light in the city, one of us finally asked the question." },
    { date: "August 2026", label: "The wedding day we cannot wait to share" },
  ],
  person1Quote:
    "From the very first day, being with you has felt like coming home to a place I didn't know I had been searching for my entire life. I would choose you again in every lifetime, without hesitation.",
  person1QuoteAttr: "Maria, in her vows draft",
  person2Quote:
    "You are the calm in every storm and the storm in every calm. Marrying you is the easiest decision I have ever made and the greatest adventure I will ever undertake.",
  person2QuoteAttr: "Christopher, allegedly unrehearsed",
};

const PRESETS: Record<string, Partial<InvitationData>> = {
  baseline: {},
  long: LONG_DATA,
  max: MAX_DATA,
};

export default async function InvitationPreviewPage({ params, searchParams }: PageProps) {
  // Block in production
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_ROUTES) {
    notFound();
  }

  const { templateId } = await params;
  const { preset = "baseline", headerMode, theme, open } = await searchParams;

  if (!SUPPORTED_TEMPLATES.includes(templateId as SupportedTemplateId)) {
    notFound();
  }
  if (!(preset in PRESETS)) {
    notFound();
  }

  const themeId: ThemeId = (THEME_IDS as readonly string[]).includes(theme ?? "")
    ? (theme as ThemeId)
    : "ivory";

  const data: InvitationData = {
    ...BASE_DATA,
    ...PRESETS[preset],
    ...(headerMode === "traditional" || headerMode === "modern"
      ? { headerMode }
      : {}),
  };

  const initialState = open ? ("open" as const) : undefined;

  const renderTemplate = () => {
    switch (templateId as SupportedTemplateId) {
      case "SPLIT_REVEAL":
        return <SplitRevealCard data={data} themeId={themeId} initialState={initialState} showReplay />;
      case "SPLIT_REVEAL_V2":
        return <SplitRevealCardV2 data={data} themeId={themeId} initialState={initialState} showReplay />;
      case "GOLDEN_CARD_REVEAL":
        return <GoldenCardReveal data={data} initialState={initialState} showHint />;
      case "FLIP_FLAP_REVEAL":
        return <FlipFlapReveal data={data} initialState={initialState} showCloseButton showHint />;
      case "WEDDING_STORYBOOK":
        return <WeddingStorybook data={data} initialState={initialState} showHint theme={themeId} />;
    }
  };

  return (
    <InvitationShell themeId={themeId} typographyPair="classic">
      {renderTemplate()}
    </InvitationShell>
  );
}
