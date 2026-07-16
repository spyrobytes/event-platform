import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TemporalProvider } from "@/components/templates/shared/TemporalContext";
import { TemporalHeroOverlay } from "@/components/templates/shared/TemporalComponents";

const SECOND = 1_000;
const HOUR = 3_600_000;

function renderOverlay(
  startOffsetMs: number,
  endOffsetMs?: number | null,
  schedule?: unknown,
) {
  const now = Date.now();
  return render(
    <TemporalProvider
      startAt={new Date(now + startOffsetMs)}
      endAt={endOffsetMs == null ? null : new Date(now + endOffsetMs)}
      schedule={schedule}
    >
      <TemporalHeroOverlay />
    </TemporalProvider>,
  );
}

/** Two segments anchored to the render clock: a 30-min first block starting
 *  at `firstStartOffsetMs`, a 30-min gap, then a 2-hour second block. */
function sampleSchedule(firstStartOffsetMs: number) {
  const now = Date.now();
  const first = now + firstStartOffsetMs;
  return [
    {
      id: "ceremony",
      label: "Ceremony",
      startAt: new Date(first).toISOString(),
      endAt: new Date(first + 30 * 60_000).toISOString(),
      isAccessPassGated: false,
    },
    {
      id: "reception",
      label: "Reception",
      startAt: new Date(first + 60 * 60_000).toISOString(),
      endAt: new Date(first + 180 * 60_000).toISOString(),
      isAccessPassGated: false,
    },
  ];
}

function confettiIn(container: HTMLElement) {
  return container.querySelector('[class*="confetti"]');
}

describe("TemporalHeroOverlay confetti gate", () => {
  it("bursts right after start for events with an end time (ongoing)", () => {
    const { container } = renderOverlay(-2 * SECOND, 2 * HOUR);
    expect(confettiIn(container)).not.toBeNull();
  });

  it("bursts right after start even when endAt is null (assumed-duration ongoing)", () => {
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

describe("TemporalHeroOverlay segment states (plan §3.6)", () => {
  it("names the segment underway with its elapsed counter (explicit end = trusted window)", () => {
    // 10 min into the ceremony (which started 10 min ago)
    const { getByText, queryByText } = renderOverlay(
      -10 * 60 * SECOND,
      4 * HOUR,
      sampleSchedule(-10 * 60 * SECOND),
    );
    expect(getByText("Ceremony underway · 10 min")).toBeTruthy();
    expect(queryByText("Happening Now")).toBeNull();
  });

  it("assumption-derived segments get the bare label — no counter on an untrusted window", () => {
    // Single open-ended entry: endMs comes from the assumed duration.
    const now = Date.now();
    const { getByText, queryByText } = renderOverlay(
      -10 * 60 * SECOND,
      4 * HOUR,
      [
        {
          id: "party",
          label: "Party",
          startAt: new Date(now - 10 * 60 * SECOND).toISOString(),
          isAccessPassGated: false,
        },
      ],
    );
    expect(getByText("Party underway")).toBeTruthy();
    expect(queryByText(/· \d+ min/)).toBeNull();
  });

  it("suppresses the counter inside the first minute", () => {
    const { getByText } = renderOverlay(
      -30 * SECOND,
      4 * HOUR,
      sampleSchedule(-30 * SECOND),
    );
    expect(getByText("Ceremony underway")).toBeTruthy();
  });

  it("shows the next-up pointer in a gap between segments", () => {
    // 45 min after the first segment started → 15 min into the gap
    const { getByText, queryByText } = renderOverlay(
      -45 * 60 * SECOND,
      4 * HOUR,
      sampleSchedule(-45 * 60 * SECOND),
    );
    expect(getByText(/Next: Reception/)).toBeTruthy();
    expect(queryByText(/underway/)).toBeNull();
    expect(queryByText("Happening Now")).toBeNull();
  });

  it("keeps the generic pill for whole-span events (no schedule)", () => {
    const { getByText } = renderOverlay(-10 * 60 * SECOND, 4 * HOUR);
    expect(getByText("Happening Now")).toBeTruthy();
  });

  it("keeps the generic pill in a trailing gap (past the last segment, before the explicit end)", () => {
    // 3.5h after the first segment start: reception ended at 3h, but the
    // event's explicit endAt is 8h out — live with nothing scheduled next.
    const { getByText, queryByText } = renderOverlay(
      -210 * 60 * SECOND,
      8 * HOUR,
      sampleSchedule(-210 * 60 * SECOND),
    );
    expect(getByText("Happening Now")).toBeTruthy();
    expect(queryByText(/Next:/)).toBeNull();
  });
});
