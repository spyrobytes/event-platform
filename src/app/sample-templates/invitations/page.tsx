import type { Metadata } from "next";
import {
  InvitationShell,
  SplitRevealCard,
  GoldenCardReveal,
  FlipFlapReveal,
  WeddingStorybook,
} from "@/components/features/Invitation";
import { DEMO_INVITATIONS_PATH } from "@/lib/demo-templates";
import type { InvitationData } from "@/schemas/invitation";
import { InvitationDemoBar, type InvitationCardOption } from "./InvitationDemoBar";

/**
 * Public, indexable demo page for the animated invitation cards shown on
 * the landing-page template showcase (plate № 06).
 *
 * Renders the real invitation template components with curated sample data —
 * the same code path as /invite/[token], no database. Each card starts
 * sealed; clicking plays the genuine reveal animation. The RSVP CTA points
 * at /join (the "create your own" conversion, mirroring the __demo__
 * sentinel behaviour on the event-page demos).
 *
 * URL state: `?card=<id>` switches between the four cards (validated;
 * unknown values fall back to the default).
 */

const PAGE_TITLE = "Animated Invitation Cards — Live Demo";
const PAGE_DESCRIPTION =
  "Tap to open four animated wedding invitation cards — Golden Card Reveal, Split Reveal, Flip Flap Reveal, and the Wedding Storybook — rendered live, exactly as your guests would see them.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: DEMO_INVITATIONS_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const INVITATION_CARDS = [
  { id: "golden", label: "Golden Card" },
  { id: "split", label: "Split Reveal" },
  { id: "flip-flap", label: "Flip Flap" },
  { id: "storybook", label: "Storybook" },
] as const satisfies readonly InvitationCardOption[];

type InvitationCardId = (typeof INVITATION_CARDS)[number]["id"];

const DEFAULT_CARD: InvitationCardId = "golden";

/**
 * One shared record — each template reads the fields it supports. Personas
 * match the landing plate (Avery & Jordan, A·J seal, 08·15·2026) so the
 * click-through feels like the same invitation coming to life.
 */
const DEMO_INVITATION_DATA: InvitationData = {
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
  rsvpUrl: "/join",
  person1Name: "Avery",
  person2Name: "Jordan",
  monogram: "A·J",
  dressCode: "Black Tie Optional",
  customMessage:
    "We can't wait to celebrate with you — an evening of vows, dinner, and dancing under the garden lights.",
  heroImageUrl: "/landing/template-demos/gallery/cin-1.jpg",
  couplePhotoUrl: "/landing/template-demos/gallery/cin-2.jpg",
  venuePhotoUrl: "/landing/template-demos/hero/cinematic-hero.jpg",
  ceremonyDate: "Saturday, August 15, 2026",
  ceremonyTime: "4:00 PM",
  ceremonyVenue: "The Rosewood Estate",
  ceremonyAddress: "48 Garden Lane, Toronto",
  receptionDate: "Saturday, August 15, 2026",
  receptionTime: "7:00 PM",
  receptionVenue: "The Rosewood Glasshouse",
  rsvpDeadline: "July 15, 2026",
  storyHeading: "How We Met",
  storyParagraphs: [
    "A shared table at a crowded café, one borrowed phone charger, and a conversation that refused to end — that was day one.",
    "Eight years, two cities, and one very good dog later, we're finally making it official in front of everyone we love.",
  ],
  timeline: [
    { date: "October 2018", label: "First met", description: "A crowded café, one free seat, and a borrowed charger." },
    { date: "June 2022", label: "Moved in together", description: "Two sets of books, one tiny apartment, zero regrets." },
    { date: "December 2025", label: "The proposal", description: "Under the first snowfall of the year, at the garden where we had our first date." },
    { date: "August 2026", label: "The wedding day" },
  ],
  person1Quote:
    "Being with you feels like coming home — I'd choose you in every lifetime.",
  person1QuoteAttr: "Avery",
  person2Quote:
    "You're the calm in every storm and the best adventure I've ever said yes to.",
  person2QuoteAttr: "Jordan",
};

type PageProps = {
  searchParams: Promise<{ card?: string }>;
};

function renderCard(cardId: InvitationCardId) {
  const data = DEMO_INVITATION_DATA;
  switch (cardId) {
    case "split":
      return <SplitRevealCard data={data} themeId="ivory" showReplay showHint />;
    case "flip-flap":
      return <FlipFlapReveal data={data} showCloseButton showHint />;
    case "storybook":
      return <WeddingStorybook data={data} showHint theme="ivory" />;
    case "golden":
      return <GoldenCardReveal data={data} showHint />;
  }
}

export default async function InvitationDemoPage({ searchParams }: PageProps) {
  const { card } = await searchParams;

  const activeCard: InvitationCardId =
    INVITATION_CARDS.find((c) => c.id === card)?.id ?? DEFAULT_CARD;

  return (
    <InvitationShell themeId="ivory" typographyPair="classic">
      {renderCard(activeCard)}
      <InvitationDemoBar
        cards={INVITATION_CARDS}
        activeId={activeCard}
        defaultId={DEFAULT_CARD}
      />
    </InvitationShell>
  );
}
