import { describe, it, expect } from "vitest";
import {
  showHeroCountdown,
  showHeroScheduleCards,
} from "@/components/templates/wedding-v3/hero-card-visibility";

// Pins the V3 opt-out semantics: unset MUST mean visible. Every live V3
// event predates these flags and has always shown the hero info cards —
// flipping the default to V2's opt-in (unset = hidden) would silently blank
// the countdown/schedule cards on all of them (issue #191).
describe("V3 hero card visibility", () => {
  it("shows the countdown when the flag is unset (backward compat)", () => {
    expect(showHeroCountdown({})).toBe(true);
    expect(showHeroCountdown({ showCountdown: undefined })).toBe(true);
  });

  it("shows the schedule cards when the flag is unset (backward compat)", () => {
    expect(showHeroScheduleCards({})).toBe(true);
    expect(showHeroScheduleCards({ showScheduleCards: undefined })).toBe(true);
  });

  it("honors an explicit opt-out", () => {
    expect(showHeroCountdown({ showCountdown: false })).toBe(false);
    expect(showHeroScheduleCards({ showScheduleCards: false })).toBe(false);
  });

  it("honors an explicit opt-in", () => {
    expect(showHeroCountdown({ showCountdown: true })).toBe(true);
    expect(showHeroScheduleCards({ showScheduleCards: true })).toBe(true);
  });
});
