/**
 * V3 Section Theme System
 *
 * A *section theme* recolors a curated subset of a template's "feature"
 * surfaces — nav, hero info cards, the countdown strip, the in-page RSVP,
 * the schedule, and the footer — independently of the base page palette.
 *
 * It works by emitting a small set of `--lux-*` CSS variables. Every themed
 * surface reads `var(--lux-X, <today's value>)`, so when NO section theme is
 * active the fallback reproduces the template's default look byte-for-byte
 * (zero visual diff). When a theme is active, the factory injects these
 * variables onto the root `<article>` and all the feature surfaces flip
 * together.
 *
 * Adding a new theme is intentionally a one-object change: supply `panel`
 * (the deep surface color) and, optionally, an `accent` override. Everything
 * else is derived here.
 */

/** A curated section color theme. Only `panel` is required. */
export type SectionTheme = {
  /** Stable id persisted on `config.theme.sectionThemeId`. */
  id: string;
  /** Human label shown in the organizer picker. */
  label: string;
  /**
   * The deep, solid surface color for panels (RSVP, footer, schedule band,
   * and the base of the nav/hero glass). This is the one defining color.
   */
  panel: string;
  /**
   * Optional metallic-accent override. Defaults to the template's live
   * `--accent` (i.e. the organizer's primaryColor / template gold), so the
   * accent keeps flowing from the existing color control unless a theme
   * deliberately pins it.
   */
  accent?: string;
  /**
   * Optional primary ink (text) color on panels. Defaults to near-white.
   * Override only for unusually light panels.
   */
  ink?: string;
};

/**
 * Derive the full `--lux-*` variable map from a SectionTheme.
 *
 * The ink ramp, hairline, and card-on-panel values are constant across dark
 * panel themes, so a theme only needs to vary `panel` (and optionally
 * `accent`). The translucent panel variants are mixed from `panel` so a
 * single color drives the nav pill, the hero glass cards, and the solid
 * sections coherently.
 */
export function getSectionThemeVariables(theme: SectionTheme): Record<string, string> {
  const { panel, accent, ink } = theme;

  const vars: Record<string, string> = {
    // Surfaces derived from the single panel color
    "--lux-panel": panel,
    // Nav pill / mobile hamburger — translucent over blurred page content
    "--lux-panel-soft": `color-mix(in srgb, ${panel} 85%, transparent)`,
    // Hero countdown/info cards — translucent glass over the (darkened) photo
    "--lux-glass": `color-mix(in srgb, ${panel} 60%, transparent)`,
    // Cards sitting on top of a panel (RSVP card, schedule cards)
    "--lux-card": "rgba(255, 255, 255, 0.06)",

    // Hairlines / borders on panels
    "--lux-line": "rgba(255, 255, 255, 0.12)",

    // Ink ramp on panels
    "--lux-ink": ink ?? "rgba(255, 255, 255, 0.92)",
    "--lux-ink-soft": "rgba(255, 255, 255, 0.62)",
    "--lux-ink-faint": "rgba(255, 255, 255, 0.4)",

    // Text that sits on top of an accent fill (e.g. CTA pill label)
    "--lux-accent-ink": panel,
  };

  // Only pin --lux-accent when a theme deliberately overrides the accent.
  // Otherwise leave it unset so each consumer's own
  // `var(--lux-accent, var(--accent, #c5a55a))` fallback keeps flowing from the
  // live --accent (and preserves the #c5a55a hard default). Emitting
  // "var(--accent)" here would be a redundant indirection that also makes that
  // hard fallback unreachable.
  if (accent) {
    vars["--lux-accent"] = accent;
  }

  return vars;
}
