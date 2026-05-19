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

export const fontPairSchema = z.enum([
  "serif_sans",
  "modern",
  "classic",
  "playfair_dmsans",
  "dmsans_sourceserif",
  "cormorant_sourceserif",
]);
export type FontPair = z.infer<typeof fontPairSchema>;

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #FF5733)");

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

export const heroStyleSchema = z.enum(["standard", "cinematic"]);

export const heroSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Title must be 80 characters or less"),
  subtitle: z.string().max(120, "Subtitle must be 120 characters or less").optional(),
  heroImageAssetId: z.string().cuid().optional(),
  align: heroAlignSchema,
  overlay: heroOverlaySchema,
  // V2 cinematic hero fields
  style: heroStyleSchema.optional(),
  showCountdown: z.boolean().optional(),
  showScheduleCards: z.boolean().optional(),
  coupleNames: z.string().max(60, "Couple names must be 60 characters or less").optional(),
  monogram: z.string().max(5, "Monogram must be 5 characters or less").optional(),
  rsvpDeadline: z.string().max(60, "RSVP deadline must be 60 characters or less").optional(),
  couplePhotoAssetId: z.string().cuid().optional(),
});

export type HeroConfig = z.infer<typeof heroSchema>;

// =============================================================================
// SECTION VISIBILITY (Guest Portal)
// =============================================================================

export const sectionVisibilitySchema = z.enum(["public", "guests", "hidden"]);
export type SectionVisibility = z.infer<typeof sectionVisibilitySchema>;

// =============================================================================
// SECTION SCHEMAS
// =============================================================================

// Details Section
export const detailsEventSchema = z.object({
  name: z.string().max(100, "Event name must be 100 characters or less").optional(),
  date: z.string().max(100, "Date must be 100 characters or less"),
  location: z.string().max(200, "Location must be 200 characters or less"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
});

export const detailsSectionDataSchema = z.object({
  dateText: z.string().max(100, "Date text must be 100 characters or less"),
  locationText: z.string().max(200, "Location text must be 200 characters or less"),
  venueDescription: z.string().max(300, "Venue description must be 300 characters or less").optional(),
  // V2 multi-event support
  events: z.array(detailsEventSchema).max(8, "Maximum 8 events allowed").optional(),
});

export const detailsSectionSchema = z.object({
  type: z.literal("details"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: detailsSectionDataSchema,
});

// Schedule Section
export const scheduleItemSchema = z.object({
  time: z.string().max(20, "Time must be 20 characters or less"),
  title: z.string().max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  location: z.string().max(200, "Location must be 200 characters or less").optional(),
});

export const scheduleGroupSchema = z.object({
  label: z.string().max(100, "Label must be 100 characters or less"),
  date: z.string().max(40, "Date must be 40 characters or less").optional(),
  location: z.string().max(200, "Location must be 200 characters or less").optional(),
  items: z.array(scheduleItemSchema).max(10, "Maximum 10 items per group"),
});

export const scheduleSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").optional(),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  items: z.array(scheduleItemSchema).max(20, "Maximum 20 schedule items allowed"),
  // V2 multi-day grouping
  groups: z.array(scheduleGroupSchema).max(6, "Maximum 6 day groups allowed").optional(),
});

export const scheduleSectionSchema = z.object({
  type: z.literal("schedule"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: scheduleSectionDataSchema,
});

// FAQ Section
export const faqItemSchema = z.object({
  q: z.string().max(200, "Question must be 200 characters or less"),
  a: z.string().max(1000, "Answer must be 1000 characters or less"),
});

export const faqSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").optional(),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  items: z.array(faqItemSchema).max(10, "Maximum 10 FAQ items allowed"),
});

export const faqSectionSchema = z.object({
  type: z.literal("faq"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: faqSectionDataSchema,
});

// Gallery Section - Enhanced with storytelling support
export const galleryItemSchema = z.object({
  assetId: z.string().cuid(),
  caption: z.string().max(200, "Caption must be 200 characters or less").optional(),
  title: z.string().max(60, "Title must be 60 characters or less").optional(),
  moment: z.string().max(30, "Moment must be 30 characters or less").optional(),
});

export const galleryDisplayModeSchema = z.enum(["grid", "carousel", "masonry", "slideshow"]);
export const galleryTransitionSchema = z.enum(["fade", "slide", "zoom", "flip"]);

export const gallerySectionDataSchema = z.object({
  // Section heading
  heading: z.string().max(60, "Heading must be 60 characters or less").optional(),
  // New items array with per-image metadata
  items: z.array(galleryItemSchema).max(30, "Maximum 30 gallery images allowed").optional(),
  // Legacy field for backward compatibility - will be migrated to items
  assetIds: z.array(z.string().cuid()).max(20).optional(),
  // Display settings (all optional for backward compatibility)
  displayMode: galleryDisplayModeSchema.optional(),
  autoPlay: z.boolean().optional(),
  autoPlayInterval: z.number().min(2).max(15).optional(),
  transition: galleryTransitionSchema.optional(),
  showCaptions: z.boolean().optional(),
});

export const gallerySectionSchema = z.object({
  type: z.literal("gallery"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: gallerySectionDataSchema,
});

/**
 * Helper to normalize gallery data - converts legacy assetIds to items format
 */
export function normalizeGalleryData(data: GallerySection["data"]): {
  heading: string;
  items: Array<{ assetId: string; caption?: string; title?: string; moment?: string }>;
  displayMode: "grid" | "carousel" | "masonry" | "slideshow";
  autoPlay: boolean;
  autoPlayInterval: number;
  transition: "fade" | "slide" | "zoom" | "flip";
  showCaptions: boolean;
} {
  // If items exist, use them; otherwise convert assetIds to items
  const items = data.items && data.items.length > 0
    ? data.items
    : (data.assetIds || []).map(assetId => ({ assetId }));

  return {
    heading: data.heading || "Gallery",
    items,
    displayMode: data.displayMode || "grid",
    autoPlay: data.autoPlay || false,
    autoPlayInterval: data.autoPlayInterval || 5,
    transition: data.transition || "fade",
    showCaptions: data.showCaptions !== false,
  };
}

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
  visibility: sectionVisibilitySchema.optional(),
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
  visibility: sectionVisibilitySchema.optional(),
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
  visibility: sectionVisibilitySchema.optional(),
  data: sponsorsSectionDataSchema,
});

// Map/Location Section
//
// Phase 2: address and coordinates are optional at the schema layer so drafts
// can save without complete location data. `validateMapSectionForPublish` in
// `src/lib/maps/map-utils.ts` enforces the publish-time requirement (enabled
// sections need a displayable address + valid coords). `address` is retained
// as a legacy alias of `formattedAddress` — `normalizeMapData` in
// `config-migrations.ts` copies it forward on read.
export const mapProviderSchema = z.enum(["locationiq", "mapbox", "osm"]);

export const mapSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Location"),
  venueName: z.string().max(100, "Venue name must be 100 characters or less").optional(),

  // Address. `formattedAddress` is the canonical Phase 2+ field; `address`
  // stays as an optional legacy alias for pre-Phase-2 saved configs.
  address: z.string().max(300, "Address must be 300 characters or less").optional(),
  formattedAddress: z.string().max(300, "Formatted address must be 300 characters or less").optional(),
  addressLine1: z.string().max(120, "Address line must be 120 characters or less").optional(),
  addressLine2: z.string().max(120, "Address line must be 120 characters or less").optional(),
  city: z.string().max(80, "City must be 80 characters or less").optional(),
  region: z.string().max(80, "Region must be 80 characters or less").optional(),
  postalCode: z.string().max(30, "Postal code must be 30 characters or less").optional(),
  country: z.string().max(80, "Country must be 80 characters or less").optional(),

  // Coordinates (optional in Phase 2 — required at publish time, see util).
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Geocoder provenance — populated when Phase 3 resolves a venue. Manual
  // entry leaves these undefined.
  placeId: z.string().max(160, "Place id must be 160 characters or less").optional(),
  provider: mapProviderSchema.optional(),
  timezone: z.string().max(80, "Timezone must be 80 characters or less").optional(),

  zoom: z.number().min(1).max(20).default(15),
  showDirectionsLink: z.boolean().default(true),

  // Guest-facing notes — surfaced in the public LocationCard (Phase 4).
  parkingNote: z.string().max(300, "Parking note must be 300 characters or less").optional(),
  entranceNote: z.string().max(300, "Entrance note must be 300 characters or less").optional(),
  accessibilityNote: z.string().max(300, "Accessibility note must be 300 characters or less").optional(),
});

export const mapSectionSchema = z.object({
  type: z.literal("map"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: mapSectionDataSchema,
});

// =============================================================================
// WEDDING-SPECIFIC SECTIONS
// =============================================================================

// Story Section - Couple's journey
export const milestoneSchema = z.object({
  year: z.string().max(10, "Year must be 10 characters or less"),
  title: z.string().max(60, "Title must be 60 characters or less"),
  description: z.string().max(200, "Description must be 200 characters or less"),
  imageAssetId: z.string().cuid().optional(),
});

export const storyLayoutSchema = z.enum(["full", "split", "timeline"]);

export const storySectionDataSchema = z.object({
  heading: z.string().max(60, "Heading must be 60 characters or less").default("Our Story"),
  content: z.string().min(50, "Story must be at least 50 characters").max(1500, "Story must be 1500 characters or less"),
  layout: storyLayoutSchema.default("full"),
  imageAssetId: z.string().cuid().optional(),
  // V2 timeline milestones
  milestones: z.array(milestoneSchema).max(8, "Maximum 8 milestones allowed").optional(),
});

export const storySectionSchema = z.object({
  type: z.literal("story"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: storySectionDataSchema,
});

// Travel & Stay Section - Accommodation info
export const hotelItemSchema = z.object({
  name: z.string().min(1, "Hotel name is required").max(100, "Name must be 100 characters or less"),
  address: z.string().max(200, "Address must be 200 characters or less"),
  bookingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  blockCode: z.string().max(30, "Block code must be 30 characters or less").optional(),
  deadline: z.string().max(100, "Deadline must be 100 characters or less").optional(),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  tags: z.array(z.string().max(30, "Tag must be 30 characters or less")).max(5, "Maximum 5 tags").optional(),
});

export const airportSchema = z.object({
  code: z.string().max(10, "Airport code must be 10 characters or less"),
  name: z.string().max(100, "Airport name must be 100 characters or less"),
  distance: z.string().max(50, "Distance must be 50 characters or less").optional(),
});

export const travelStaySectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Travel & Accommodations"),
  hotels: z.array(hotelItemSchema).max(5, "Maximum 5 hotels allowed"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
  // V2 airport and tips fields
  airports: z.array(airportSchema).max(3, "Maximum 3 airports allowed").optional(),
  tips: z.array(z.string().max(200, "Tip must be 200 characters or less")).max(5, "Maximum 5 tips allowed").optional(),
});

export const travelStaySectionSchema = z.object({
  type: z.literal("travelStay"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: travelStaySectionDataSchema,
});

// Wedding Party Section - Bridal party
export const partySideSchema = z.enum(["bride", "groom", "other"]);

export const partyMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  role: z.string().min(1, "Role is required").max(50, "Role must be 50 characters or less"),
  bio: z.string().max(300, "Bio must be 300 characters or less").optional(),
  imageAssetId: z.string().cuid().optional(),
  // V2 explicit side assignment
  side: partySideSchema.optional(),
});

export const weddingPartySectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("The Wedding Party"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  members: z.array(partyMemberSchema).max(30, "Maximum 30 party members allowed"),
});

export const weddingPartySectionSchema = z.object({
  type: z.literal("weddingParty"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: weddingPartySectionDataSchema,
});

// Attire Section - Dress code guidance
export const attireIconStyleSchema = z.enum(["auto", "formal", "casual"]);

// Optional "extras" card: a list of vendor/tailor entries shown as a second
// card below the primary dress-code card. Each vendor has an optional flat
// contact triple (label/type/value); the renderer decides how to link based
// on `contactType` and skips contacts without a value.
export const attireExtrasContactTypeSchema = z.enum(["url", "phone", "email", "text"]);

export const attireExtrasVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required").max(80, "Name must be 80 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
  contactLabel: z.string().max(40, "Label must be 40 characters or less").optional(),
  contactType: attireExtrasContactTypeSchema.optional(),
  contactValue: z.string().min(1).max(200, "Contact value must be 200 characters or less").optional(),
});

export const attireExtrasSchema = z.object({
  title: z.string().max(60, "Title must be 60 characters or less").optional(),
  vendors: z.array(attireExtrasVendorSchema).min(1).max(4, "Maximum 4 vendor entries"),
});

export const attireSectionDataSchema = z.object({
  heading: z.string().max(60, "Heading must be 60 characters or less").default("Dress Code"),
  dressCode: z.string().min(1, "Dress code is required").max(50, "Dress code must be 50 characters or less"),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
  colors: z.array(z.string().max(30)).max(6, "Maximum 6 suggested colors").optional(),
  iconStyle: attireIconStyleSchema.optional(),
  extras: attireExtrasSchema.optional(),
});

export const attireSectionSchema = z.object({
  type: z.literal("attire"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: attireSectionDataSchema,
});

// Things To Do Section - Local attractions
export const activityCategorySchema = z.enum(["food", "attraction", "activity", "shopping", "nature"]);

export const activityItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  category: activityCategorySchema.optional(),
  address: z.string().max(200, "Address must be 200 characters or less").optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const thingsToDoSectionDataSchema = z.object({
  heading: z.string().max(80, "Heading must be 80 characters or less").default("Things To Do"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  items: z.array(activityItemSchema).max(12, "Maximum 12 activities allowed"),
});

export const thingsToDoSectionSchema = z.object({
  type: z.literal("thingsToDo"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: thingsToDoSectionDataSchema,
});

// Registry Section - Gift registry (V2)
// `type` distinguishes external retailer links ("link") from cash / honeymoon
// funds ("fund"). Defaults to "link" for backward compatibility with items
// created before the field existed. See RegistryEditor + RegistrySection for
// how the two types render (CTA label, field visibility).
//
// `id` is a stable per-item identifier (UUID). Required by Phase 2 guest
// claims so a claim can reference an item that survives reorders/edits.
// Existing items missing `id` get one backfilled lazily during migration
// (see migratePageConfig in src/lib/config-migrations.ts). The value is a
// plain non-empty string so either UUID or CUID work without schema churn.
export const registryItemSchema = z.object({
  id: z.string().min(1, "Registry item id is required"),
  type: z.enum(["link", "fund"]).default("link"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amountLabel: z.string().max(40, "Amount must be 40 characters or less").optional(),
  category: z.string().max(40, "Category must be 40 characters or less").optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  logoAssetId: z.string().cuid().optional(),
  imageAssetId: z.string().cuid().optional(),
  description: z.string().max(200, "Description must be 200 characters or less").optional(),
  note: z.string().max(200, "Note must be 200 characters or less").optional(),
  featured: z.boolean().optional(),
  // For "link" items this means "claimed/purchased" (renders Claimed badge).
  // For "fund" items this means "fund is closed" (renders Closed badge and
  // hides Contribute). Single underlying flag — both states hide the CTA.
  purchased: z.boolean().optional(),
});

export const registrySectionDataSchema = z.object({
  heading: z.string().max(60, "Heading must be 60 characters or less").default("Gift Registry"),
  description: z.string().max(300, "Description must be 300 characters or less").optional(),
  items: z.array(registryItemSchema).max(24, "Maximum 24 registry items allowed"),
});

export const registrySectionSchema = z.object({
  type: z.literal("registry"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: registrySectionDataSchema,
});

// Wedding Wishes Section — moderated guest messages displayed as a wall of
// ripped-paper cards. Messages themselves are stored on the RSVP row
// (see Rsvp.messageToHost / messageStatus); this section config controls
// only the editorial framing and structural settings around them.
export const wishesSectionDataSchema = z.object({
  eyebrow: z.string().max(40, "Eyebrow must be 40 characters or less").optional(),
  heading: z.string().max(60, "Heading must be 60 characters or less").default("Wedding Wishes"),
  intro: z.string().max(300, "Intro must be 300 characters or less").optional(),
  // How many wishes appear on the main event page; remainder spill onto the
  // dedicated /wishes route. Range matches the visual capacity of the
  // ripped-paper grid (3 columns × up to 2 rows).
  previewCount: z.number().int().min(1).max(6).default(3),
  // When false, the RSVP form will not show the "Message for the couple"
  // field even if the section is enabled (organizer can collect existing
  // wishes without inviting more).
  enableSubmissions: z.boolean().default(true),
});

export const wishesSectionSchema = z.object({
  type: z.literal("wishes"),
  enabled: z.boolean(),
  visibility: sectionVisibilitySchema.optional(),
  data: wishesSectionDataSchema,
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
  // Wedding-specific sections
  storySectionSchema,
  travelStaySectionSchema,
  weddingPartySectionSchema,
  attireSectionSchema,
  thingsToDoSectionSchema,
  registrySectionSchema,
  wishesSectionSchema,
]);

export type Section = z.infer<typeof sectionSchema>;
export type DetailsSection = z.infer<typeof detailsSectionSchema>;
export type DetailsEvent = z.infer<typeof detailsEventSchema>;
export type ScheduleSection = z.infer<typeof scheduleSectionSchema>;
export type ScheduleGroup = z.infer<typeof scheduleGroupSchema>;
export type FAQSection = z.infer<typeof faqSectionSchema>;
export type GallerySection = z.infer<typeof gallerySectionSchema>;
export type GalleryItem = z.infer<typeof galleryItemSchema>;
export type GalleryDisplayMode = z.infer<typeof galleryDisplayModeSchema>;
export type GalleryTransition = z.infer<typeof galleryTransitionSchema>;
export type RSVPSection = z.infer<typeof rsvpSectionSchema>;
export type SpeakersSection = z.infer<typeof speakersSectionSchema>;
export type SpeakerItem = z.infer<typeof speakerItemSchema>;
export type SpeakerLink = z.infer<typeof speakerLinkSchema>;
export type SponsorsSection = z.infer<typeof sponsorsSectionSchema>;
export type SponsorItem = z.infer<typeof sponsorItemSchema>;
export type SponsorTier = z.infer<typeof sponsorTierSchema>;
export type MapSection = z.infer<typeof mapSectionSchema>;
// Wedding-specific section types
export type StorySection = z.infer<typeof storySectionSchema>;
export type TravelStaySection = z.infer<typeof travelStaySectionSchema>;
export type HotelItem = z.infer<typeof hotelItemSchema>;
export type WeddingPartySection = z.infer<typeof weddingPartySectionSchema>;
export type PartyMember = z.infer<typeof partyMemberSchema>;
export type AttireSection = z.infer<typeof attireSectionSchema>;
export type AttireIconStyle = z.infer<typeof attireIconStyleSchema>;
export type AttireExtras = z.infer<typeof attireExtrasSchema>;
export type AttireExtrasVendor = z.infer<typeof attireExtrasVendorSchema>;
export type AttireExtrasContactType = z.infer<typeof attireExtrasContactTypeSchema>;
export type ThingsToDoSection = z.infer<typeof thingsToDoSectionSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ActivityCategory = z.infer<typeof activityCategorySchema>;
// V2 types
export type RegistrySection = z.infer<typeof registrySectionSchema>;
export type RegistryItem = z.infer<typeof registryItemSchema>;
export type WishesSection = z.infer<typeof wishesSectionSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Airport = z.infer<typeof airportSchema>;
export type PartySide = z.infer<typeof partySideSchema>;
export type ChromeConfig = z.infer<typeof chromeConfigSchema>;
export type HeroStyle = z.infer<typeof heroStyleSchema>;
export type StoryLayout = z.infer<typeof storyLayoutSchema>;

// =============================================================================
// SOCIAL LINKS (opt-in per template — Premium feature)
// =============================================================================

export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "pinterest",
  "website",
] as const;

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

export const socialLinkSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().url("Must be a valid URL"),
  label: z.string().max(40, "Label must be 40 characters or less").optional(),
});

export const socialLinksSchema = z
  .array(socialLinkSchema)
  .max(8, "Maximum 8 social links allowed");

export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type SocialLink = z.infer<typeof socialLinkSchema>;

// =============================================================================
// FULL PAGE CONFIG
// =============================================================================

export const chromeConfigSchema = z.object({
  topbar: z.boolean().optional(),
  scrollProgress: z.boolean().optional(),
  mountainDividers: z.boolean().optional(),
  footerSkyline: z.boolean().optional(),
  botanicals: z.boolean().optional(),
});

export const eventPageConfigV1Schema = z.object({
  schemaVersion: z.literal(1),
  variantId: z.string().max(50).optional(), // Wedding variant ID (e.g., "classic", "modern_minimal")
  theme: themeSchema,
  hero: heroSchema,
  sections: z.array(sectionSchema).max(12, "Maximum 12 sections allowed"),
  // V2 chrome settings
  chrome: chromeConfigSchema.optional(),
  // Optional social media links — shown in footer on templates that opt in
  socialLinks: socialLinksSchema.optional(),
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
