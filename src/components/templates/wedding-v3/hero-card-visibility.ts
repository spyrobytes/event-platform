import type { HeroConfig } from "@/schemas/event-page";

/**
 * Visibility of the hero info cards (countdown / schedule) for V3 templates.
 *
 * V3 heroes have always rendered these cards automatically whenever the data
 * existed, so the organizer flags are OPT-OUT here: unset = visible. This is
 * deliberately the opposite of V2's CinematicHero, where the same
 * `hero.showCountdown` / `hero.showScheduleCards` fields are opt-in
 * (unset = hidden) — adopting V2's semantics would silently blank the cards
 * on every existing V3 event. Single source for the rule so the factory,
 * all six hero renderers, and the editor can't drift (pinned by
 * tests/unit/hero-card-visibility.test.ts).
 */
export function showHeroCountdown(
  hero: Pick<HeroConfig, "showCountdown">,
): boolean {
  return hero.showCountdown ?? true;
}

export function showHeroScheduleCards(
  hero: Pick<HeroConfig, "showScheduleCards">,
): boolean {
  return hero.showScheduleCards ?? true;
}
