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
   * The deep surface color for panels (RSVP, footer, schedule band, and the
   * base of the nav/hero glass) — the one defining color.
   *
   * PRECONDITION: must be a DARK 6-digit hex (e.g. "#34005B"). The whole ink
   * ramp (--lux-ink / -soft / -mid / -faint) and the line/card tokens are light
   * (white-alpha) and assume a dark panel; a light panel would render
   * white-on-light across every themed surface. `panel` is also interpolated
   * into color-mix() for the translucent nav/glass surfaces, so it must be a
   * valid CSS hex — a malformed value is replaced with a safe dark fallback.
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
   * Optional override for the PRIMARY panel ink (--lux-ink) only. Defaults to
   * near-white. The secondary rungs (--lux-ink-soft / -mid / -faint) stay
   * white-alpha, so this does NOT make a light panel legible — keep panels dark.
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
/** Matches a 6-digit hex color (e.g. "#34005B"). */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
/** Safe dark panel used if a definition ships a malformed `panel`. */
const FALLBACK_PANEL = "#121110";

export function getSectionThemeVariables(theme: SectionTheme): Record<string, string> {
  const { accent, ink } = theme;

  // `panel` is interpolated into color-mix() and used as a solid surface below.
  // A malformed value would make those declarations invalid and silently drop
  // the backgrounds (a transparent nav pill / hero glass), so fall back to a
  // safe dark. Definitions should always supply a valid dark hex (see
  // SectionTheme's precondition).
  const panel = HEX_COLOR_RE.test(theme.panel) ? theme.panel : FALLBACK_PANEL;

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

    // Ink ramp on panels (light → dim). The countdown strip uses the lower
    // three rungs (soft/mid/faint) for its label/unit/sub supporting text.
    "--lux-ink": ink ?? "rgba(255, 255, 255, 0.92)",
    "--lux-ink-soft": "rgba(255, 255, 255, 0.62)",
    "--lux-ink-mid": "rgba(255, 255, 255, 0.5)",
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
