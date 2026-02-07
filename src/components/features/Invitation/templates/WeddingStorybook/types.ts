import type { InvitationData } from "@/schemas/invitation";
import type { InvitationState } from "@/hooks";

/**
 * Color theme variants for the Wedding Storybook.
 * Maps to the platform's standard theme IDs.
 */
export type StorybookTheme = "ivory" | "blush" | "sage" | "midnight" | "champagne";

/**
 * Event schedule item for the timeline display.
 */
export type ScheduleItem = {
  /** Time label (e.g. "4:00 PM") */
  time: string;
  /** Activity name (e.g. "Ceremony") */
  activity: string;
};

/**
 * Venue information with optional photo and caption.
 */
export type VenueDisplay = {
  name: string;
  address: string;
  location: string;
  photoUrl?: string;
  photoAlt?: string;
  caption?: string;
};

/**
 * Celebration details for the "What to Expect" page.
 */
export type CelebrationDetails = {
  ceremonyLocation?: string;
  receptionLocation?: string;
  attire?: string;
};

/**
 * "Our Story" page content.
 */
export type OurStory = {
  text: string;
  photoUrl?: string;
  photoAlt?: string;
  quote?: string;
  quoteAttribution?: string;
};

/**
 * Contact information for the final page.
 */
export type ContactInfo = {
  email?: string;
  websiteUrl?: string;
  websiteLabel?: string;
};

/**
 * Props for the WeddingStorybook component.
 */
export type WeddingStorybookProps = {
  /** Invitation data from schema */
  data: InvitationData;

  /** Initial state of the invitation */
  initialState?: InvitationState;

  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;

  /** Starting page index (0-based) — uncontrolled mode */
  defaultPage?: number;

  /** Controlled page index — component becomes controlled when set */
  page?: number;

  /** Callback when page changes */
  onPageChange?: (page: number) => void;

  /** Color theme — derived from InvitationShell if not specified */
  theme?: StorybookTheme;

  /** Disable particle burst effects */
  disableParticles?: boolean;

  /** Show turn page hint on cover */
  showHint?: boolean;

  /** Additional CSS class name */
  className?: string;
};

/**
 * Page navigation direction
 */
export type FlipDirection = "forward" | "backward" | null;
