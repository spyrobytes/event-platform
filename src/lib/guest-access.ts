import type { Section, SectionVisibility } from "@/schemas/event-page";

// =============================================================================
// ACCESS LEVELS
// =============================================================================

export type AccessLevel = "public" | "guest";

// =============================================================================
// DEFAULT VISIBILITY PER SECTION TYPE
// =============================================================================

const DEFAULT_VISIBILITY: Record<string, SectionVisibility> = {
  // Public by default — SEO-valuable or essential info
  details: "public",
  faq: "public",
  map: "public",
  speakers: "public",
  sponsors: "public",
  rsvp: "public",
  // Guest-only by default — private/intimate content
  schedule: "guests",
  gallery: "guests",
  story: "guests",
  weddingParty: "guests",
  attire: "guests",
  travelStay: "guests",
  thingsToDo: "guests",
  registry: "guests",
};

/**
 * Returns the default visibility for a section type.
 * Unknown section types default to "public" for safety.
 */
export function getDefaultVisibility(sectionType: string): SectionVisibility {
  return DEFAULT_VISIBILITY[sectionType] ?? "public";
}

/**
 * Returns the effective visibility for a section, falling back to defaults
 * when the field is not set (backward compat for existing configs).
 */
export function getEffectiveVisibility(section: Section): SectionVisibility {
  return section.visibility ?? getDefaultVisibility(section.type);
}

// =============================================================================
// SECTION FILTERING
// =============================================================================

/**
 * Filters sections based on the viewer's access level.
 * - "public" viewers see only sections with public visibility
 * - "guest" viewers see public + guests sections
 * - "hidden" sections are always excluded
 * - Disabled sections are always excluded
 */
export function filterSectionsByVisibility(
  sections: Section[],
  accessLevel: AccessLevel
): Section[] {
  return sections.filter((section) => {
    if (!section.enabled) return false;

    const visibility = getEffectiveVisibility(section);
    if (visibility === "hidden") return false;
    if (visibility === "guests" && accessLevel === "public") return false;
    return true;
  });
}

/**
 * Returns true if the event has any guest-only sections that are enabled.
 * Used to decide whether portal links are worth showing in emails/UI.
 */
export function hasGuestOnlySections(sections: Section[]): boolean {
  return sections.some(
    (s) => s.enabled && getEffectiveVisibility(s) === "guests"
  );
}

// =============================================================================
// SECTION LABELS
// =============================================================================

export const SECTION_LABELS: Record<string, string> = {
  details: "Details",
  schedule: "Schedule",
  faq: "FAQ",
  gallery: "Gallery",
  rsvp: "RSVP",
  speakers: "Speakers",
  sponsors: "Sponsors",
  map: "Location",
  story: "Our Story",
  travelStay: "Travel & Stay",
  weddingParty: "Wedding Party",
  attire: "Attire",
  thingsToDo: "Things to Do",
  registry: "Gift Registry",
};

/**
 * Returns a human-readable label for a section type.
 */
export function getSectionLabel(sectionType: string): string {
  return SECTION_LABELS[sectionType] || sectionType;
}

// =============================================================================
// PORTAL URL
// =============================================================================

/**
 * Builds the guest portal URL for an event.
 * This URL includes the invite token as a query parameter.
 */
export function buildPortalUrl(eventSlug: string, rawToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";
  return `${baseUrl}/e/${eventSlug}?tk=${rawToken}`;
}
