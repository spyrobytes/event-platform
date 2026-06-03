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
 * (the surface color) and, optionally, an `accent` override. Everything else
 * — including whether the surfaces read as light-on-dark or dark-on-light — is
 * derived here from the panel's luminance.
 */

import { getContrastRatio } from "@/lib/color";

/** A curated section color theme. Only `panel` is required. */
export type SectionTheme = {
  /** Stable id persisted on `config.theme.sectionThemeId`. */
  id: string;
  /** Human label shown in the organizer picker. */
  label: string;
  /**
   * The surface color for panels (RSVP, footer, schedule band, countdown
   * strip, and the base of the nav) — the one defining color.
   *
   * Polarity is derived from `panel`'s luminance: a DARK panel (e.g. "#34005B")
   * gets a white-alpha ink ramp (light-on-dark); a LIGHT/mid panel (e.g.
   * "#55a1bf") gets a black-alpha ramp + dark hairlines (dark-on-light). The
   * hero is exempt — it sits over a dark photo and always stays light-on-dark
   * (see the `--lux-hero-*` tokens below).
   *
   * NOTE: a light/mid panel kills a light metallic accent (champagne gold reads
   * ~1.2:1 on cerulean) — pin a dark `accent` for it. `panel` is interpolated
   * into color-mix(), so it must be a valid 6-digit hex; a malformed value is
   * replaced with a safe dark fallback.
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
   * near-white on a dark panel / near-black on a light panel. The secondary
   * rungs (--lux-ink-soft / -mid / -faint) follow the derived polarity.
   */
  ink?: string;
};

/**
 * Derive the full `--lux-*` variable map from a SectionTheme.
 *
 * Polarity is read from the panel's luminance. A DARK panel keeps the original
 * white-alpha ink ramp + light hairlines (light-on-dark); a LIGHT/mid panel
 * flips to a black-alpha ramp + dark hairlines (dark-on-light) so text stays
 * legible. The translucent panel variants are mixed from `panel` so one color
 * drives the nav pill and the solid sections coherently.
 *
 * The HERO is special: it sits over a dark, dimmed photo, so it must read
 * light-on-dark for EVERY theme. Its surfaces therefore read a separate
 * `--lux-hero-*` set that this function always emits as on-dark values — for a
 * dark theme they equal the body tokens (hero unchanged); for a light theme
 * they keep the hero cinematic while the body flips. See
 * FullscreenDramaticHero.module.css.
 */
/** Matches a 6-digit hex color (e.g. "#34005B"). */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
/** Safe dark panel used if a definition ships a malformed `panel`. */
const FALLBACK_PANEL = "#121110";

/** White-alpha ink ramp for a dark panel (light-on-dark). */
const DARK_INK = {
  ink: "rgba(255, 255, 255, 0.92)",
  soft: "rgba(255, 255, 255, 0.62)",
  mid: "rgba(255, 255, 255, 0.5)",
  faint: "rgba(255, 255, 255, 0.4)",
};
/**
 * Black-alpha ink ramp for a light/mid panel (dark-on-light). Heavier alphas
 * than DARK_INK because black-on-mid needs more weight than white-on-dark to
 * clear AA — calibrated so even the faint rung stays ≥3:1 on a mid panel like
 * "#55a1bf" (primary 6.9 / soft 5.6 / mid 4.5 / faint 3.6).
 */
const LIGHT_INK = {
  ink: "rgba(0, 0, 0, 0.95)",
  soft: "rgba(0, 0, 0, 0.78)",
  mid: "rgba(0, 0, 0, 0.68)",
  faint: "rgba(0, 0, 0, 0.58)",
};

export function getSectionThemeVariables(theme: SectionTheme): Record<string, string> {
  const { accent, ink } = theme;

  // `panel` is interpolated into color-mix() and used as a solid surface below.
  // A malformed value would make those declarations invalid and silently drop
  // the backgrounds (a transparent nav pill), so fall back to a safe dark.
  const panel = HEX_COLOR_RE.test(theme.panel) ? theme.panel : FALLBACK_PANEL;

  // Polarity: does dark text read better than white on this panel? Compare
  // contrast both ways rather than picking a magic luminance threshold.
  const isLight =
    getContrastRatio(panel, "#000000") > getContrastRatio(panel, "#ffffff");
  const ramp = isLight ? LIGHT_INK : DARK_INK;

  const vars: Record<string, string> = {
    // --- Body surfaces (flip with polarity) ---
    "--lux-panel": panel,
    // Nav pill / mobile hamburger — translucent over blurred page content
    "--lux-panel-soft": `color-mix(in srgb, ${panel} 85%, transparent)`,
    // Hero info cards — translucent glass over the (darkened) photo, read by the
    // hero only. A DARK panel's 60% tint is already dark enough for the white
    // hero ink. A LIGHT panel's 60% tint would be a MID surface where the muted
    // ink rungs and the gold accent fail (~3:1), so a light panel gets a dark,
    // faintly-tinted glass instead — matching the dark themes' glass contrast
    // (muted white ≥4:1, gold ≥5.8:1 over both dark and bright photo regions).
    "--lux-glass": isLight
      ? `color-mix(in srgb, ${panel} 14%, rgba(10, 12, 15, 0.72))`
      : `color-mix(in srgb, ${panel} 60%, transparent)`,
    // Cards on top of a panel (RSVP card, schedule cards): a barely-there inset
    // — a light wash on a dark panel, a dark wash on a light one.
    "--lux-card": isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)",
    // Hairlines / borders on panels
    "--lux-line": isLight ? "rgba(0, 0, 0, 0.14)" : "rgba(255, 255, 255, 0.12)",

    // Ink ramp on panels (strong → faint). The countdown strip uses the lower
    // rungs (soft/mid/faint) for its label/unit/sub supporting text.
    "--lux-ink": ink ?? ramp.ink,
    "--lux-ink-soft": ramp.soft,
    "--lux-ink-mid": ramp.mid,
    "--lux-ink-faint": ramp.faint,

    // Text on top of an accent fill (e.g. CTA pill label). The factory refines
    // this by contrast against the live accent; `panel` is the seed.
    "--lux-accent-ink": panel,

    // --- Hero-only surfaces (always on-dark; see the doc above). For a dark
    // panel these equal the body values, so the hero is byte-unchanged. ---
    "--lux-hero-surface": isLight
      ? `color-mix(in srgb, ${panel} 22%, #0b0d10)`
      : panel,
    "--lux-hero-ink-soft": isLight ? "rgba(255, 255, 255, 0.72)" : DARK_INK.soft,
    "--lux-hero-ink-faint": isLight
      ? "rgba(255, 255, 255, 0.45)"
      : DARK_INK.faint,
    "--lux-hero-line": isLight
      ? "rgba(255, 255, 255, 0.14)"
      : "rgba(255, 255, 255, 0.12)",
  };

  // Countdown number reads its own `--temporal-accent` — fine on a dark panel,
  // invisible-risk on a light one — so pin a dark ink ONLY for light panels.
  // Dark/unthemed keep --temporal-accent (zero regression).
  if (isLight) {
    vars["--lux-num-ink"] = LIGHT_INK.ink;
  }

  // Pin --lux-accent only when a theme overrides the accent (a light panel must,
  // since a light metallic dies on it). Otherwise leave it unset so consumers'
  // `var(--lux-accent, var(--accent, #c5a55a))` keeps flowing from the live
  // --accent (and preserves the #c5a55a hard default).
  //
  // --lux-hero-accent governs the hero info-card accents. On a dark panel it
  // mirrors --lux-accent (a pinned dark-theme accent reaches the hero too); on
  // a light panel it's left UNSET so the hero accents fall back to the live
  // gold --accent over the dark photo — never the body's dark ink, which would
  // vanish on the hero glass.
  if (accent) {
    vars["--lux-accent"] = accent;
    if (!isLight) vars["--lux-hero-accent"] = accent;
  }

  return vars;
}
