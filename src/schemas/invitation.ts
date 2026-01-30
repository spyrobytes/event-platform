import { z } from "zod";

// =============================================================================
// CONSTANTS
// =============================================================================

export const INVITATION_TEMPLATES = [
  "ENVELOPE_REVEAL",
  "ENVELOPE_REVEAL_V2",
  "SPLIT_REVEAL",
  "LAYERED_UNFOLD",
  "CINEMATIC_SCROLL",
  "TIME_BASED_REVEAL",
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
  eventTypeText: { max: 80, recommended: 60 },
  monogram: { max: 10 },
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
  eventTypeText: z.string().max(CONTENT_LIMITS.eventTypeText.max).optional(),
  monogram: z.string().max(CONTENT_LIMITS.monogram.max).optional(),
  customMessage: z.string().max(CONTENT_LIMITS.customMessage.max).optional(),
  dressCode: z.string().max(CONTENT_LIMITS.dressCode.max).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
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
  heroImageUrl: z.string().url().optional(),
  rsvpUrl: z.string(),
  // Structured names and customizable wording (optional, templates use defaults)
  person1Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  person2Name: z.string().max(CONTENT_LIMITS.personName.max).optional(),
  headerText: z.string().max(CONTENT_LIMITS.headerText.max).optional(),
  eventTypeText: z.string().max(CONTENT_LIMITS.eventTypeText.max).optional(),
  monogram: z.string().max(CONTENT_LIMITS.monogram.max).optional(),
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
