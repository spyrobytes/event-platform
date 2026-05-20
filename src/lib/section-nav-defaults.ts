import type { Section } from "@/schemas/event-page";
import { SECTION_LABELS } from "@/lib/guest-access";

export type TemplateFamily = "wedding" | "conference" | "party";

export function getTemplateFamily(templateId: string | null | undefined): TemplateFamily {
  if (!templateId) return "wedding";
  if (templateId.startsWith("conference")) return "conference";
  if (templateId.startsWith("party")) return "party";
  return "wedding";
}

/**
 * Default-on AND priority-ordered nav set per template family. The array
 * order is the canonical nav order — wedding always reads as Story · Schedule ·
 * RSVP · Gallery · Details regardless of where those sections sit in the
 * page-section array. Anything an organizer toggles on via the editor that
 * is not in this list appears after the priority items, in section array
 * order.
 */
export const DEFAULT_NAV_SHOW: Record<TemplateFamily, readonly string[]> = {
  wedding: ["story", "schedule", "rsvp", "gallery", "details"],
  conference: ["schedule", "speakers", "rsvp", "map"],
  party: ["schedule", "rsvp", "gallery", "map"],
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
  return DEFAULT_NAV_SHOW[family]?.includes(section.type) ?? false;
}

/**
 * Returns the sections that should appear in nav, ordered by template
 * priority first (per DEFAULT_NAV_SHOW), then any extras the organizer
 * toggled on via the editor, in section array order.
 */
export function orderSectionsForNav<T extends Section>(
  sections: T[],
  family: TemplateFamily,
): T[] {
  const priority = DEFAULT_NAV_SHOW[family] ?? [];

  const eligible = new Map<string, T>();
  for (const s of sections) {
    if (s.enabled && shouldShowInNav(s, family)) {
      eligible.set(s.type, s);
    }
  }

  const ordered: T[] = [];
  for (const type of priority) {
    const s = eligible.get(type);
    if (s) {
      ordered.push(s);
      eligible.delete(type);
    }
  }
  for (const s of sections) {
    if (eligible.has(s.type)) {
      ordered.push(s);
      eligible.delete(s.type);
    }
  }
  return ordered;
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

  const candidates: NavItem[] = orderSectionsForNav(sections, family).map((s) => ({
    id: getSectionId ? getSectionId(s.type) : s.type,
    label: resolveNavLabel(s, family),
    href: `#${getSectionId ? getSectionId(s.type) : s.type}`,
  }));

  return {
    visible: candidates.slice(0, cap),
    overflow: candidates.slice(cap),
  };
}
