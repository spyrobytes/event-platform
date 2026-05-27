import { PAGE_CONFIG_LIMITS, type Section } from "@/schemas/event-page";
import { SECTION_LABELS } from "@/lib/guest-access";
import type { TemplateId } from "@/schemas/event";

export type TemplateFamily = "wedding" | "conference" | "party";

/**
 * templateId → family map. Exhaustive over VALID_TEMPLATE_IDS — TypeScript
 * will refuse to compile when a new template ID is added to event.ts until
 * its family is declared here, so we can't silently route a new ID to the
 * wedding default the way a startsWith prefix heuristic would.
 */
const TEMPLATE_ID_TO_FAMILY: Record<TemplateId, TemplateFamily> = {
  wedding_v1: "wedding",
  wedding_v2: "wedding",
  wedding_editorial: "wedding",
  wedding_intimate_note: "wedding",
  wedding_fine_art: "wedding",
  wedding_garden_house: "wedding",
  wedding_grand_luxe: "wedding",
  wedding_celebration: "wedding",
  conference_v1: "conference",
  party_v1: "party",
};

export function getTemplateFamily(templateId: string | null | undefined): TemplateFamily {
  if (!templateId) return "wedding";
  return TEMPLATE_ID_TO_FAMILY[templateId as TemplateId] ?? "wedding";
}

/**
 * Strict wedding-family check. Distinct from `getTemplateFamily(...) === "wedding"`:
 * this returns `false` for null/undefined/unknown IDs instead of defaulting
 * to wedding. Use this for gates that should only fire on explicitly
 * recognized wedding templates (e.g. the RSVP side selector).
 */
export function isWeddingTemplate(templateId: string | null | undefined): boolean {
  if (!templateId) return false;
  return TEMPLATE_ID_TO_FAMILY[templateId as TemplateId] === "wedding";
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
 * Whether the section has anything the renderer will actually paint
 * *on the main page* (preview-mode), so the nav link's scroll target
 * exists in the DOM. A section can be `enabled: true` and toggled on
 * in nav yet still render nothing — e.g. a livestream with no primary
 * URL bails to `null` in preview mode. Without this gate, clearing the
 * URL leaves a phantom nav link pointing at a `#live` anchor that
 * doesn't exist.
 *
 * Note: this is intentionally tighter than the `/e/[slug]/live` sub-page
 * 404 gate, which also accepts replay-only configurations (the sub-page
 * renders in full mode and can show a replay alone in the ended branch).
 * Nav cares about the main-page anchor; the sub-page cares about
 * whether the full-mode renderer has any source to play.
 *
 * Only special-cases section types that truly render nothing when
 * unconfigured. Sections that always paint *something* (a header, an
 * empty-state card, etc.) should NOT be added here — their nav link is
 * still useful.
 */
function hasRenderableContent(section: Section): boolean {
  if (section.type === "livestream") return Boolean(section.data.primary);
  return true;
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

  const eligibleIdx: number[] = [];
  sections.forEach((s, i) => {
    if (s.enabled && shouldShowInNav(s, family) && hasRenderableContent(s)) {
      eligibleIdx.push(i);
    }
  });

  const ordered: T[] = [];
  const consumed = new Set<number>();

  // Priority pass: first eligible section of each priority type claims that
  // nav slot. If two sections share the same type (the page array doesn't
  // enforce uniqueness), the first wins the priority slot; subsequent ones
  // fall through to the extras pass below.
  for (const type of priority) {
    const matchIdx = eligibleIdx.find(
      (i) => !consumed.has(i) && sections[i].type === type,
    );
    if (matchIdx !== undefined) {
      ordered.push(sections[matchIdx]);
      consumed.add(matchIdx);
    }
  }

  // Extras pass: unconsumed eligible sections in section array order.
  for (const i of eligibleIdx) {
    if (!consumed.has(i)) ordered.push(sections[i]);
  }

  return ordered;
}

export function resolveNavLabel(section: Section, family: TemplateFamily): string {
  const explicit = section.nav?.label?.trim();
  if (explicit) return explicit;

  const max = PAGE_CONFIG_LIMITS.navLabelMaxLength;
  const heading =
    "heading" in section.data && typeof section.data.heading === "string"
      ? section.data.heading.trim()
      : undefined;
  if (heading && heading.length > 0 && heading.length <= max) return heading;

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
