import type { SectionTheme } from "../wedding-v3/theme-packs/section-themes";

/**
 * V2 Cinematic section color themes.
 *
 * Mirrors Grand Luxe's `--lux-*` section-theme system (see
 * `wedding-v3/theme-packs/section-themes.ts`): a light "Cream" base punctuated
 * by themed *anchor panels* (nav, hero cards, schedule, RSVP, footer) rather
 * than a whole-page palette swap. Each theme is one `panel` hex; the generator
 * derives the full ink/accent ramp and polarity from it.
 *
 * Panels reuse Grand Luxe's contrast-tuned hexes so the two templates read as
 * one family. Accent is intentionally NOT pinned — it flows from the
 * organizer's `theme.primaryColor` (the live `--accent`), so a couple can pair
 * any metallic with the panel; gold gives the classic look.
 *
 * "Cream" is the default (no theme selected) — today's light look — so it is
 * the picker's default option, not an entry here.
 */
export const V2_SECTION_THEMES: SectionTheme[] = [
  { id: "midnight", label: "Midnight", panel: "#253139" },
  { id: "emerald", label: "Emerald", panel: "#0E2E26" },
  { id: "plum", label: "Plum", panel: "#34005B" },
  // The one LIGHT panel — a cerulean field with deep-ink type. Triggers the
  // generator's dark-on-light path; the accent is pinned to a near-ink navy
  // because gold can't survive at ~1.2:1 on this panel. The hero stays
  // cinematic via the --lux-hero-* tokens. Mirrors Grand Luxe's `cerulean`.
  { id: "cerulean", label: "Cerulean", panel: "#55a1bf", accent: "#0a1f2b" },
];

/** The default "no section theme" option (today's cream/light look). */
export const V2_DEFAULT_SECTION_THEME = {
  label: "Cream",
  swatch: "#f0ebe3",
} as const;

/** Resolve a persisted `theme.sectionThemeId` to its theme, or undefined. */
export function getV2SectionTheme(
  id: string | undefined
): SectionTheme | undefined {
  return id ? V2_SECTION_THEMES.find((t) => t.id === id) : undefined;
}

/**
 * Map a legacy curated `variantId` (the old flat color modes) to its
 * (sectionThemeId, displayStyle) equivalent. Lets the editor show the right
 * selection for events still on a variant and migrate them off it on first
 * change. Live events are all on `scrapbook_edition` (Cream Scrapbook).
 */
export function mapVariantToSelection(variantId: string | undefined): {
  sectionThemeId: string | undefined;
  displayStyle: "standard" | "scrapbook";
} {
  switch (variantId) {
    case "scrapbook_edition":
      return { sectionThemeId: undefined, displayStyle: "scrapbook" }; // Cream Scrapbook
    case "scrapbook_midnight":
      return { sectionThemeId: "midnight", displayStyle: "scrapbook" };
    case "scrapbook_emerald":
      return { sectionThemeId: "emerald", displayStyle: "scrapbook" };
    case "scrapbook_plum":
      return { sectionThemeId: "plum", displayStyle: "scrapbook" };
    case "midnight_gold":
      return { sectionThemeId: "midnight", displayStyle: "standard" };
    case "emerald_ivory":
      return { sectionThemeId: "emerald", displayStyle: "standard" };
    case "plum_blush":
      return { sectionThemeId: "plum", displayStyle: "standard" };
    default:
      return { sectionThemeId: undefined, displayStyle: "standard" };
  }
}
