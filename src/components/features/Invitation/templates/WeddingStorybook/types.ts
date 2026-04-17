import type { InvitationData } from "@/schemas/invitation";

/** Props for the WeddingStorybook component */
export type WeddingStorybookProps = {
  data: InvitationData;
  theme?: "ivory" | "blush" | "sage" | "midnight" | "champagne";
  initialState?: "open";
  showHint?: boolean;
  className?: string;
};

/** Internal types mapped from InvitationData for page components */
export type StorybookData = {
  person1: string;
  person2: string;
  date: string;
  year: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  ceremonyAddress: string;
  receptionTime: string;
  receptionVenue: string;
  receptionAddress: string;
  headerMode?: "modern" | "traditional";
  headerText?: string;
  person1FamilyName?: string;
  person2FamilyName?: string;
  familyInviteText?: string;
  dressCode?: string;
  rsvpUrl?: string;
  rsvpDeadline?: string;
  monogram?: string;
  couplePhotoUrl?: string;
  venuePhotoUrl?: string;
  story?: StoryContent;
  timeline?: TimelineEvent[];
  quote?: QuoteContent;
  groomQuote?: QuoteContent;
};

export type StoryContent = {
  heading: string;
  paragraphs: string[];
};

export type TimelineEvent = {
  date: string;
  label: string;
  description?: string;
};

export type QuoteContent = {
  text: string;
  attribution?: string;
};

export type PageSide = "left" | "right";

export type PageVariant = "dark" | "light" | "accent";

export type SpreadLabel =
  | "cover"
  | "story"
  | "timeline"
  | "details"
  | "rsvp";

export const SPREAD_LABELS: SpreadLabel[] = [
  "cover",
  "story",
  "timeline",
  "details",
  "rsvp",
];

export const TOTAL_SPREADS = SPREAD_LABELS.length;
export const TOTAL_PAGES = TOTAL_SPREADS * 2;
