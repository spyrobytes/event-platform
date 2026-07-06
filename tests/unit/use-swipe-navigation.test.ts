import { describe, it, expect } from "vitest";

import {
  lockAxis,
  resolveSwipe,
  windowVelocity,
  type VelocitySample,
} from "@/hooks/use-swipe-navigation";

// The hook's gesture *feel* needs a real device, but its decision core is two
// pure functions — these are what we lock down here.

describe("lockAxis", () => {
  it("returns 'none' below the lock threshold", () => {
    expect(lockAxis(3, 2)).toBe("none");
    expect(lockAxis(0, 0)).toBe("none");
    // Just under the default 8px radius.
    expect(lockAxis(5, 5)).toBe("none"); // hypot ≈ 7.07
  });

  it("locks horizontal for a mostly-horizontal drag", () => {
    expect(lockAxis(40, 4)).toBe("horizontal");
  });

  it("locks vertical for a mostly-vertical drag", () => {
    expect(lockAxis(4, 40)).toBe("vertical");
  });

  it("resolves a horizontal-dominant diagonal to horizontal", () => {
    expect(lockAxis(30, 20)).toBe("horizontal");
  });

  it("resolves a vertical-dominant diagonal to vertical", () => {
    expect(lockAxis(20, 30)).toBe("vertical");
  });

  it("breaks an exact 45-degree tie toward horizontal (the owned axis)", () => {
    expect(lockAxis(20, 20)).toBe("horizontal");
    expect(lockAxis(-15, 15)).toBe("horizontal");
  });

  it("honours a custom lock radius", () => {
    expect(lockAxis(6, 0, 20)).toBe("none");
    expect(lockAxis(30, 0, 20)).toBe("horizontal");
  });
});

describe("resolveSwipe", () => {
  const W = 400; // distance threshold = max(50, 400 * 0.18) = 72px
  const slow = 0; // no velocity

  it("returns 'none' for a slow short drag (under distance, no flick)", () => {
    expect(resolveSwipe({ dx: 30, width: W, velocity: slow })).toBe("none");
    expect(resolveSwipe({ dx: -30, width: W, velocity: slow })).toBe("none");
  });

  it("commits next on a slow long LEFT drag", () => {
    expect(resolveSwipe({ dx: -100, width: W, velocity: slow })).toBe("next");
  });

  it("commits prev on a slow long RIGHT drag", () => {
    expect(resolveSwipe({ dx: 100, width: W, velocity: slow })).toBe("prev");
  });

  it("commits next on a fast short LEFT flick (velocity path)", () => {
    // 30px is under the 72px distance threshold, but the flick is fast.
    expect(resolveSwipe({ dx: -30, width: W, velocity: -0.9 })).toBe("next");
  });

  it("commits prev on a fast short RIGHT flick (velocity path)", () => {
    expect(resolveSwipe({ dx: 30, width: W, velocity: 0.9 })).toBe("prev");
  });

  it("stays 'none' when both distance and velocity are below threshold", () => {
    expect(resolveSwipe({ dx: 20, width: W, velocity: 0.1 })).toBe("none");
  });

  it("tie-breaks direction by velocity when dx is exactly 0", () => {
    expect(resolveSwipe({ dx: 0, width: W, velocity: -0.9 })).toBe("next");
    expect(resolveSwipe({ dx: 0, width: W, velocity: 0.9 })).toBe("prev");
  });

  it("follows flick velocity even when the finger drifts the other way at release", () => {
    // Fast flick LEFT (intends next), but dx drifts +5px at release. Distance is
    // not met, so direction follows velocity — not the residual dx sign.
    expect(resolveSwipe({ dx: 5, width: W, velocity: -0.9 })).toBe("next");
    expect(resolveSwipe({ dx: -5, width: W, velocity: 0.9 })).toBe("prev");
  });

  it("trusts dx (not velocity) once the deliberate distance is met", () => {
    // Long right drag with a small opposite-sign velocity wobble → still prev.
    expect(resolveSwipe({ dx: 100, width: W, velocity: -0.2 })).toBe("prev");
  });

  it("respects custom thresholds", () => {
    // Raise the distance floor so a 100px drag no longer qualifies on distance,
    // and raise the velocity floor so a 0.5 flick no longer qualifies either.
    expect(
      resolveSwipe({
        dx: 100,
        width: W,
        velocity: 0.5,
        minPx: 200,
        fraction: 0.6,
        velocityPxPerMs: 1.0,
      }),
    ).toBe("none");
  });

  it("uses a safe fallback for zero / invalid width (no NaN, no throw)", () => {
    // width 0 → safeWidth 1 → distance threshold = max(50, 0.18) = 50.
    expect(resolveSwipe({ dx: 60, width: 0, velocity: slow })).toBe("prev");
    expect(resolveSwipe({ dx: 10, width: 0, velocity: slow })).toBe("none");
    expect(resolveSwipe({ dx: 60, width: -100, velocity: slow })).toBe("prev");
  });
});

describe("windowVelocity", () => {
  // Helper: evenly-spaced samples moving at a constant px/ms rate.
  const ramp = (rate: number, steps: number, dtMs = 16): VelocitySample[] =>
    Array.from({ length: steps }, (_, i) => ({ x: i * dtMs * rate, t: i * dtMs }));

  it("returns 0 with fewer than two samples", () => {
    expect(windowVelocity([])).toBe(0);
    expect(windowVelocity([{ x: 10, t: 100 }])).toBe(0);
  });

  it("measures a constant-rate drag exactly", () => {
    expect(windowVelocity(ramp(0.5, 6))).toBeCloseTo(0.5);
    expect(windowVelocity(ramp(-1.2, 6))).toBeCloseTo(-1.2);
  });

  it("ignores samples older than the window", () => {
    // Slow start long ago, fast finish inside the window: the stale prefix
    // must not dilute the measured throw.
    const samples: VelocitySample[] = [
      { x: 0, t: 0 }, // stale (300ms before newest)
      { x: 5, t: 150 }, // stale
      { x: 100, t: 250 },
      { x: 150, t: 280 },
      { x: 200, t: 300 },
    ];
    // Window covers t ∈ [220, 300]: (200 - 100) / (300 - 250) = 2 px/ms.
    expect(windowVelocity(samples, 80)).toBeCloseTo(2);
  });

  it("smooths a single erratic segment instead of trusting it", () => {
    // Steady leftward flick with one jittery reversal sample in the middle —
    // the window average keeps the true direction; the old single-segment
    // measure would have read only the final pair.
    const samples: VelocitySample[] = [
      { x: 0, t: 0 },
      { x: -20, t: 16 },
      { x: -35, t: 32 }, // jitter: brief stall
      { x: -34, t: 33 }, // 1px reversal in 1ms → single-segment says +1 px/ms
      { x: -60, t: 48 },
    ];
    const v = windowVelocity(samples, 80);
    expect(v).toBeLessThan(0); // still a leftward throw
    expect(v).toBeCloseTo(-60 / 48);
  });

  it("falls back to the last segment when older samples fall outside the window", () => {
    const samples: VelocitySample[] = [
      { x: 0, t: 0 },
      { x: 80, t: 200 }, // only pair inside any 80ms window ending at t=200
    ];
    expect(windowVelocity(samples, 80)).toBeCloseTo(80 / 200);
  });

  it("returns 0 for coincident timestamps (no NaN/Infinity)", () => {
    expect(
      windowVelocity([
        { x: 0, t: 100 },
        { x: 50, t: 100 },
      ]),
    ).toBe(0);
  });
});
