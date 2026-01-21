import { z } from "zod";

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

/**
 * Validates that a hex color meets WCAG AA contrast requirements
 * against white background (4.5:1 ratio for normal text)
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((c) => {
      const val = parseInt(c, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color has sufficient contrast against white background
 * WCAG AA requires 4.5:1 for normal text
 */
export function isAccessibleColor(color: string): boolean {
  try {
    const ratio = getContrastRatio(color, "#FFFFFF");
    return ratio >= 4.5;
  } catch {
    return false;
  }
}

export const themePresetSchema = z.enum(["classic", "modern", "romantic"]);
export type ThemePreset = z.infer<typeof themePresetSchema>;

export const fontPairSchema = z.enum(["serif_sans", "modern", "classic"]);
export type FontPair = z.infer<typeof fontPairSchema>;

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #FF5733)")
  .refine(isAccessibleColor, {
    message: "Color must meet WCAG AA contrast requirements (4.5:1 ratio)",
  });

export const themeSchema = z.object({
  preset: themePresetSchema,
  primaryColor: hexColorSchema,
  fontPair: fontPairSchema,
});

export type ThemeConfig = z.infer<typeof themeSchema>;

// =============================================================================
// HERO SECTION
// =============================================================================

export const heroAlignSchema = z.enum(["left", "center"]);
export const heroOverlaySchema = z.enum(["none", "soft", "strong"]);

export const heroSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Title must be 80 characters or less"),
  subtitle: z.string().max(120, "Subtitle must be 120 characters or less").optional(),
  heroImageAssetId: z.string().cuid().optional(),
  align: heroAlignSchema,
  overlay: heroOverlaySchema,
});

export type HeroConfig = z.infer<typeof heroSchema>;

// =============================================================================
// SECTION SCHEMAS
// =============================================================================

// Details Section
export const detailsSectionDataSchema = z.object({
  dateText: z.string().max(100, "Date text must be 100 characters or less"),
  locationText: z.string().max(200, "Location text must be 200 characters or less"),
});

export const detailsSectionSchema = z.object({
  type: z.literal("details"),
  enabled: z.boolean(),
  data: detailsSectionDataSchema,
});

// Schedule Section
export const scheduleItemSchema = z.object({
  time: z.string().max(20, "Time must be 20 characters or less"),
  title: z.string().max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

export const scheduleSectionDataSchema = z.object({
  items: z.array(scheduleItemSchema).max(20, "Maximum 20 schedule items allowed"),
});

export const scheduleSectionSchema = z.object({
  type: z.literal("schedule"),
  enabled: z.boolean(),
  data: scheduleSectionDataSchema,
});

// FAQ Section
export const faqItemSchema = z.object({
  q: z.string().max(200, "Question must be 200 characters or less"),
  a: z.string().max(1000, "Answer must be 1000 characters or less"),
});

export const faqSectionDataSchema = z.object({
  items: z.array(faqItemSchema).max(10, "Maximum 10 FAQ items allowed"),
});

export const faqSectionSchema = z.object({
  type: z.literal("faq"),
  enabled: z.boolean(),
  data: faqSectionDataSchema,
});

// Gallery Section
export const gallerySectionDataSchema = z.object({
  assetIds: z.array(z.string().cuid()).max(20, "Maximum 20 gallery images allowed"),
});

export const gallerySectionSchema = z.object({
  type: z.literal("gallery"),
  enabled: z.boolean(),
  data: gallerySectionDataSchema,
});

// RSVP Section
export const rsvpSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("RSVP"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  showMaybeOption: z.boolean().default(true),
  allowPlusOnes: z.boolean().default(false),
  maxPlusOnes: z.number().min(0).max(10).default(0),
  successMessage: z.string().max(200, "Success message must be 200 characters or less").optional(),
});

export const rsvpSectionSchema = z.object({
  type: z.literal("rsvp"),
  enabled: z.boolean(),
  data: rsvpSectionDataSchema,
});

// Speakers/Guests Section
export const speakerLinkSchema = z.object({
  type: z.enum(["website", "twitter", "linkedin", "instagram"]),
  url: z.string().url("Must be a valid URL"),
});

export const speakerItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  role: z.string().max(100, "Role must be 100 characters or less").optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  imageAssetId: z.string().cuid().optional(),
  links: z.array(speakerLinkSchema).max(4, "Maximum 4 links per speaker").optional(),
});

export const speakersSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Speakers"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  items: z.array(speakerItemSchema).max(12, "Maximum 12 speakers allowed"),
});

export const speakersSectionSchema = z.object({
  type: z.literal("speakers"),
  enabled: z.boolean(),
  data: speakersSectionDataSchema,
});

// Sponsors Section
export const sponsorTierSchema = z.enum(["platinum", "gold", "silver", "bronze", "partner"]);

export const sponsorItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  tier: sponsorTierSchema.optional(),
  logoAssetId: z.string().cuid().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional(),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
});

export const sponsorsSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Our Sponsors"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  showTiers: z.boolean().default(false),
  items: z.array(sponsorItemSchema).max(20, "Maximum 20 sponsors allowed"),
});

export const sponsorsSectionSchema = z.object({
  type: z.literal("sponsors"),
  enabled: z.boolean(),
  data: sponsorsSectionDataSchema,
});

// Map/Location Section
export const mapSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Location"),
  venueName: z.string().max(100, "Venue name must be 100 characters or less").optional(),
  address: z.string().max(300, "Address must be 300 characters or less"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zoom: z.number().min(1).max(20).default(15),
  showDirectionsLink: z.boolean().default(true),
});

export const mapSectionSchema = z.object({
  type: z.literal("map"),
  enabled: z.boolean(),
  data: mapSectionDataSchema,
});

// Union of all sections
export const sectionSchema = z.discriminatedUnion("type", [
  detailsSectionSchema,
  scheduleSectionSchema,
  faqSectionSchema,
  gallerySectionSchema,
  rsvpSectionSchema,
  speakersSectionSchema,
  sponsorsSectionSchema,
  mapSectionSchema,
]);

export type Section = z.infer<typeof sectionSchema>;
export type DetailsSection = z.infer<typeof detailsSectionSchema>;
export type ScheduleSection = z.infer<typeof scheduleSectionSchema>;
export type FAQSection = z.infer<typeof faqSectionSchema>;
export type GallerySection = z.infer<typeof gallerySectionSchema>;
export type RSVPSection = z.infer<typeof rsvpSectionSchema>;
export type SpeakersSection = z.infer<typeof speakersSectionSchema>;
export type SpeakerItem = z.infer<typeof speakerItemSchema>;
export type SpeakerLink = z.infer<typeof speakerLinkSchema>;
export type SponsorsSection = z.infer<typeof sponsorsSectionSchema>;
export type SponsorItem = z.infer<typeof sponsorItemSchema>;
export type SponsorTier = z.infer<typeof sponsorTierSchema>;
export type MapSection = z.infer<typeof mapSectionSchema>;

// =============================================================================
// FULL PAGE CONFIG
// =============================================================================

export const eventPageConfigV1Schema = z.object({
  schemaVersion: z.literal(1),
  theme: themeSchema,
  hero: heroSchema,
  sections: z.array(sectionSchema).max(12, "Maximum 12 sections allowed"),
});

export type EventPageConfigV1 = z.infer<typeof eventPageConfigV1Schema>;

// =============================================================================
// ENFORCED LIMITS (for reference and validation)
// =============================================================================

export const PAGE_CONFIG_LIMITS = {
  maxSections: 12,
  maxGalleryImages: 20,
  maxFaqItems: 10,
  maxScheduleItems: 20,
  maxSpeakers: 12,
  maxSponsors: 20,
  heroTitleLength: 80,
  heroSubtitleLength: 120,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  maxAssetsPerEvent: 50,
} as const;

// =============================================================================
// PARTIAL SCHEMAS FOR UPDATES
// =============================================================================

/**
 * Schema for updating theme only
 */
export const updateThemeSchema = themeSchema.partial();
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

/**
 * Schema for updating hero only
 */
export const updateHeroSchema = heroSchema.partial();
export type UpdateHeroInput = z.infer<typeof updateHeroSchema>;

/**
 * Schema for updating the full page config
 */
export const updatePageConfigSchema = z.object({
  theme: themeSchema.optional(),
  hero: heroSchema.optional(),
  sections: z.array(sectionSchema).max(12).optional(),
});

export type UpdatePageConfigInput = z.infer<typeof updatePageConfigSchema>;
