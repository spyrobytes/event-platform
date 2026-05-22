import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

export const INVITATION_TEMPLATES = [
  "ENVELOPE_REVEAL",
  "ENVELOPE_REVEAL_V2",
  "SPLIT_REVEAL",
  "SPLIT_REVEAL_V2",
  "LAYERED_UNFOLD",
  "CINEMATIC_SCROLL",
  "TIME_BASED_REVEAL",
  "TIME_BASED_REVEAL_V2",
  "GOLDEN_CARD_REVEAL",
  "FLIP_FLAP_REVEAL",
  "WEDDING_STORYBOOK",
] as const;

export const THEME_IDS = [
  "ivory",
  "blush",
  "sage",
  "midnight",
  "champagne",
] as const;

export const TYPOGRAPHY_PAIRS = ["classic", "modern", "traditional"] as const;

export const TEXT_DIRECTIONS = ["LTR", "RTL"] as const;

export const HEADER_MODES = ["modern", "traditional"] as const;

// =============================================================================
// CONTENT CONSTRAINTS
// =============================================================================

/**
 * Content length constraints for invitation fields.
 * Used for validation and UI feedback.
 */
export const CONTENT_LIMITS = {
  coupleDisplayName: { max: 60, recommended: 40 },
  personName: { max: 50, recommended: 30 },
  eventTitle: { max: 40, recommended: 30 },
  venueName: { max: 50, recommended: 35 },
  address: { max: 100, maxLines: 3 },
  inviteeDisplayName: { max: 40, recommended: 25 },
  salutation: { max: 20 },
  dressCode: { max: 30, recommended: 20 },
  customMessage: { max: 200, recommended: 150, maxLines: 4 },
  headerText: { max: 60, recommended: 40 },
  familyName: { max: 80, recommended: 50 },
  familyInviteText: { max: 120, recommended: 80 },
  eventTypeText: { max: 80, recommended: 60 },
  monogram: { max: 10 },
  storyHeading: { max: 60, recommended: 30 },
  storyParagraph: { max: 500, recommended: 300 },
  timelineEventLabel: { max: 50 },
  timelineEventDescription: { max: 150 },
  quote: { max: 250, recommended: 200 },
  eventDateText: { max: 80, recommended: 50 },
  eventTimeText: { max: 60, recommended: 40 },
} as const;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Schema for invitation template selection
 */
export const invitationTemplateSchema = z.enum(INVITATION_TEMPLATES);

export type InvitationTemplate = z.infer<typeof invitationTemplateSchema>;

/**
 * Schema for theme ID selection
 */
export const themeIdSchema = z.enum(THEME_IDS);

export type ThemeId = z.infer<typeof themeIdSchema>;

/**
 * Schema for typography pair selection
 */
export const typographyPairSchema = z.enum(TYPOGRAPHY_PAIRS);

export type TypographyPair = z.infer<typeof typographyPairSchema>;

/**
 * Schema for text direction
 */
export const textDirectionSchema = z.enum(TEXT_DIRECTIONS);

export type TextDirection = z.infer<typeof textDirectionSchema>;

/**
 * Schema for creating/updating invitation configuration
 */
export const invitationConfigSchema = z.object({
  template: invitationTemplateSchema.default("ENVELOPE_REVEAL"),
  themeId: themeIdSchema.default("ivory"),
  typographyPair: typographyPairSchema.default("classic"),
  coupleDisplayName: z
    .string()
    .max(CONTENT_LIMITS.coupleDisplayName.max)
    .optional(),
  // Structured couple names (preferred over coupleDisplayName for precise control)
  person1Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  person2Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  // Customizable invitation wording
  headerText: z.string().max(CONTENT_LIMITS.headerText.max).optional(),
  headerMode: z.enum(HEADER_MODES).default("modern"),
  // Traditional header fields (family names displayed above couple names)
  person1FamilyName: z.string().max(CONTENT_LIMITS.familyName.max).optional(),
  person2FamilyName: z.string().max(CONTENT_LIMITS.familyName.max).optional(),
  familyInviteText: z.string().max(CONTENT_LIMITS.familyInviteText.max).optional(),
  eventTypeText: z.string().max(CONTENT_LIMITS.eventTypeText.max).optional(),
  monogram: z.string().max(CONTENT_LIMITS.monogram.max).optional(),
  customMessage: z.string().max(CONTENT_LIMITS.customMessage.max).optional(),
  dressCode: z.string().max(CONTENT_LIMITS.dressCode.max).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  // Wedding Storybook fields
  couplePhotoUrl: z.string().url().optional().or(z.literal("")),
  venuePhotoUrl: z.string().url().optional().or(z.literal("")),
  ceremonyStartAt: z.coerce.date().optional(),
  ceremonyDate: z.string().max(CONTENT_LIMITS.eventDateText.max).optional(),
  ceremonyTime: z.string().max(CONTENT_LIMITS.eventTimeText.max).optional(),
  ceremonyVenue: z.string().max(CONTENT_LIMITS.venueName.max).optional(),
  ceremonyAddress: z.string().max(CONTENT_LIMITS.address.max).optional(),
  receptionStartAt: z.coerce.date().optional(),
  receptionDate: z.string().max(CONTENT_LIMITS.eventDateText.max).optional(),
  receptionTime: z.string().max(60).optional(),
  receptionVenue: z.string().max(CONTENT_LIMITS.venueName.max).optional(),
  receptionAddress: z.string().max(CONTENT_LIMITS.address.max).optional(),
  rsvpDeadline: z.string().max(60).optional(),
  storyHeading: z.string().max(CONTENT_LIMITS.storyHeading.max).optional(),
  storyParagraphs: z.array(z.string().max(CONTENT_LIMITS.storyParagraph.max)).optional(),
  timelineJson: z
    .array(
      z.object({
        date: z.string(),
        label: z.string().max(CONTENT_LIMITS.timelineEventLabel.max),
        description: z.string().max(CONTENT_LIMITS.timelineEventDescription.max).optional(),
      })
    )
    .optional(),
  person1Quote: z.string().max(CONTENT_LIMITS.quote.max).optional(),
  person1QuoteAttr: z.string().max(50).optional(),
  person2Quote: z.string().max(CONTENT_LIMITS.quote.max).optional(),
  person2QuoteAttr: z.string().max(50).optional(),
  locale: z.string().default("en-US"),
  textDirection: textDirectionSchema.default("LTR"),
});

export type InvitationConfigInput = z.infer<typeof invitationConfigSchema>;

/**
 * Schema for venue information displayed on invitation
 */
export const venueInfoSchema = z.object({
  name: z.string().max(CONTENT_LIMITS.venueName.max),
  address: z.string().max(CONTENT_LIMITS.address.max),
  city: z.string(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export type VenueInfo = z.infer<typeof venueInfoSchema>;

/**
 * Schema for invitation data passed to templates
 */
export const invitationDataSchema = z.object({
  coupleNames: z.string().max(CONTENT_LIMITS.coupleDisplayName.max),
  eventTitle: z.string().max(CONTENT_LIMITS.eventTitle.max),
  eventDate: z.date(),
  eventTime: z.string(),
  timezone: z.string(),
  venue: venueInfoSchema,
  inviteeName: z.string().max(CONTENT_LIMITS.inviteeDisplayName.max).optional(),
  salutation: z.string().max(CONTENT_LIMITS.salutation.max).optional(),
  dressCode: z.string().max(CONTENT_LIMITS.dressCode.max).optional(),
  customMessage: z.string().max(CONTENT_LIMITS.customMessage.max).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  rsvpUrl: z.string(),
  // Structured names and customizable wording (optional, templates use defaults)
  person1Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  person2Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  headerText: z.string().max(CONTENT_LIMITS.headerText.max).optional(),
  headerMode: z.enum(HEADER_MODES).optional(),
  person1FamilyName: z.string().max(CONTENT_LIMITS.familyName.max).optional(),
  person2FamilyName: z.string().max(CONTENT_LIMITS.familyName.max).optional(),
  familyInviteText: z.string().max(CONTENT_LIMITS.familyInviteText.max).optional(),
  eventTypeText: z.string().max(CONTENT_LIMITS.eventTypeText.max).optional(),
  monogram: z.string().max(CONTENT_LIMITS.monogram.max).optional(),
  // Wedding Storybook extended fields
  couplePhotoUrl: z.string().url().optional().or(z.literal("")),
  venuePhotoUrl: z.string().url().optional().or(z.literal("")),
  ceremonyStartAt: z.coerce.date().optional(),
  ceremonyDate: z.string().optional(),
  ceremonyTime: z.string().optional(),
  ceremonyVenue: z.string().optional(),
  ceremonyAddress: z.string().optional(),
  receptionStartAt: z.coerce.date().optional(),
  receptionDate: z.string().optional(),
  receptionTime: z.string().optional(),
  receptionVenue: z.string().optional(),
  receptionAddress: z.string().optional(),
  rsvpDeadline: z.string().optional(),
  storyHeading: z.string().optional(),
  storyParagraphs: z.array(z.string()).optional(),
  timeline: z
    .array(
      z.object({
        date: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  person1Quote: z.string().optional(),
  person1QuoteAttr: z.string().optional(),
  person2Quote: z.string().optional(),
  person2QuoteAttr: z.string().optional(),
});

export type InvitationData = z.infer<typeof invitationDataSchema>;

/**
 * Schema for invitation state machine
 */
export const invitationStateSchema = z.enum([
  "idle",
  "opening",
  "open",
  "closing",
]);

export type InvitationState = z.infer<typeof invitationStateSchema>;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Truncates text to max length with ellipsis.
 * Used to enforce content constraints gracefully.
 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Validates content length and returns warning if exceeds recommended.
 */
export function validateContentLength(
  text: string,
  limits: { max: number; recommended?: number }
): { isValid: boolean; isOverRecommended: boolean; message?: string } {
  if (text.length > limits.max) {
    return {
      isValid: false,
      isOverRecommended: true,
      message: `Maximum ${limits.max} characters allowed`,
    };
  }

  if (limits.recommended && text.length > limits.recommended) {
    return {
      isValid: true,
      isOverRecommended: true,
      message: `Recommended: ${limits.recommended} characters or less`,
    };
  }

  return { isValid: true, isOverRecommended: false };
}
