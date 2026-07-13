import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TemporalProvider } from "@/components/templates/shared/TemporalContext";
import { TemporalHeroOverlay } from "@/components/templates/shared/TemporalComponents";

const SECOND = 1_000;
const HOUR = 3_600_000;

function renderOverlay(startOffsetMs: number, endOffsetMs?: number | null) {
  const now = Date.now();
  return render(
    <TemporalProvider
      startAt={new Date(now + startOffsetMs)}
      endAt={endOffsetMs == null ? null : new Date(now + endOffsetMs)}
    >
      <TemporalHeroOverlay />
    </TemporalProvider>,
  );
}

function confettiIn(container: HTMLElement) {
  return container.querySelector('[class*="confetti"]');
}

describe("TemporalHeroOverlay confetti gate", () => {
  it("bursts right after start for events with an end time (ongoing)", () => {
    const { container } = renderOverlay(-2 * SECOND, 2 * HOUR);
    expect(confettiIn(container)).not.toBeNull();
  });

  it("bursts right after start even when endAt is null (zero-duration → 'ended' instantly)", () => {
    const { container } = renderOverlay(-2 * SECOND, null);
    expect(confettiIn(container)).not.toBeNull();
  });

  it("does not burst once the just-started window has passed", () => {
    const { container } = renderOverlay(-30 * SECOND, 2 * HOUR);
    expect(confettiIn(container)).toBeNull();
  });

  it("does not burst while still counting down", () => {
    const { container } = renderOverlay(60 * SECOND, 2 * HOUR);
    expect(confettiIn(container)).toBeNull();
  });
});
