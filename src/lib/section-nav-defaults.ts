import type { Section } from "@/schemas/event-page";
import { SECTION_LABELS } from "@/lib/guest-access";

export type TemplateFamily = "wedding" | "conference" | "party";

export function getTemplateFamily(templateId: string | null | undefined): TemplateFamily {
  if (!templateId) return "wedding";
  if (templateId.startsWith("conference")) return "conference";
  if (templateId.startsWith("party")) return "party";
  return "wedding";
}

export const DEFAULT_NAV_SHOW: Record<TemplateFamily, ReadonlySet<string>> = {
  wedding: new Set(["story", "schedule", "rsvp", "gallery", "details"]),
  conference: new Set(["schedule", "speakers", "rsvp", "map"]),
  party: new Set(["schedule", "rsvp", "gallery", "map"]),
};

export const MAX_VISIBLE_NAV_ITEMS: Record<TemplateFamily, number> = {
  wedding: 5,
  conference: 5,
  party: 4,
};

export const TEMPLATE_LABEL_OVERRIDES: Record<TemplateFamily, Record<string, string>> = {
  wedding: {
    travelStay: "Travel",
    registry: "Registry",
  },
  conference: {
    schedule: "Agenda",
    rsvp: "Register",
    map: "Venue",
  },
  party: {
    gallery: "Photos",
    speakers: "Hosts",
    sponsors: "Thanks",
  },
};

export function shouldShowInNav(section: Section, family: TemplateFamily): boolean {
  if (section.nav?.show !== undefined) return section.nav.show;
  return DEFAULT_NAV_SHOW[family]?.has(section.type) ?? false;
}

const NAV_LABEL_MAX = 20;

export function resolveNavLabel(section: Section, family: TemplateFamily): string {
  const explicit = section.nav?.label?.trim();
  if (explicit) return explicit;

  const heading =
    "heading" in section.data && typeof section.data.heading === "string"
      ? section.data.heading.trim()
      : undefined;
  if (heading && heading.length > 0 && heading.length <= NAV_LABEL_MAX) return heading;

  const override = TEMPLATE_LABEL_OVERRIDES[family]?.[section.type];
  if (override) return override;

  return SECTION_LABELS[section.type] ?? section.type;
}

export type NavItem = {
  id: string;
  label: string;
  href: string;
};

export function buildNavItems(
  sections: Section[],
  templateId: string | null | undefined,
  getSectionId?: (type: string) => string,
): { visible: NavItem[]; overflow: NavItem[] } {
  const family = getTemplateFamily(templateId);
  const cap = MAX_VISIBLE_NAV_ITEMS[family];

  const candidates: NavItem[] = sections
    .filter((s) => s.enabled && shouldShowInNav(s, family))
    .map((s) => ({
      id: getSectionId ? getSectionId(s.type) : s.type,
      label: resolveNavLabel(s, family),
      href: `#${getSectionId ? getSectionId(s.type) : s.type}`,
    }));

  return {
    visible: candidates.slice(0, cap),
    overflow: candidates.slice(cap),
  };
}
