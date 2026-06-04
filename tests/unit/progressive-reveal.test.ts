import { describe, it, expect } from "vitest";
import {
  resolveVisibleCount,
  REVEAL_ALL,
  GALLERY_REVEAL,
  PARTY_REVEAL,
} from "@/hooks/use-progressive-reveal";

describe("resolveVisibleCount", () => {
  it("uses the viewport floor when there are no extra reveals (rawCount 0)", () => {
    // mobile floor of 6 against a 30-item grid
    expect(resolveVisibleCount(0, 6, 30)).toBe(6);
  });

  it("never exceeds the total number of items", () => {
    expect(resolveVisibleCount(0, 6, 4)).toBe(4);
    expect(resolveVisibleCount(100, 6, 30)).toBe(30);
  });

  it("honours accumulated reveals above the floor", () => {
    // revealed up to 18, mobile floor 6 -> 18
    expect(resolveVisibleCount(18, 6, 30)).toBe(18);
  });

  it("never shrinks when the viewport widens (floor rises, reveals kept)", () => {
    // user revealed 18 on mobile, then resizes to tablet (floor 12) -> still 18
    expect(resolveVisibleCount(18, 12, 30)).toBe(18);
    // user revealed only the mobile floor (rawCount 0), resizes to tablet -> 12
    expect(resolveVisibleCount(0, 12, 30)).toBe(12);
  });

  it("renders everything on desktop (REVEAL_ALL floor) and stays finite", () => {
    const visible = resolveVisibleCount(0, REVEAL_ALL, 30);
    expect(visible).toBe(30);
    expect(Number.isFinite(visible)).toBe(true);
  });

  it("handles empty grids", () => {
    expect(resolveVisibleCount(0, 6, 0)).toBe(0);
    expect(resolveVisibleCount(0, REVEAL_ALL, 0)).toBe(0);
  });
});

describe("reveal increments (simulating revealMore)", () => {
  // Mirrors the reducer in useProgressiveReveal:
  // next = min(total, resolveVisibleCount(prev, floor, total) + batch)
  const step = (prev: number, floor: number, batch: number, total: number) =>
    Math.min(total, resolveVisibleCount(prev, floor, total) + batch);

  it("adds one mobile batch per click and clamps at total", () => {
    const { mobile: floor } = GALLERY_REVEAL.initial;
    const { mobile: batch } = GALLERY_REVEAL.batch;
    const total = 20;

    let raw = 0;
    expect(resolveVisibleCount(raw, floor, total)).toBe(6); // initial
    raw = step(raw, floor, batch, total);
    expect(resolveVisibleCount(raw, floor, total)).toBe(12);
    raw = step(raw, floor, batch, total);
    expect(resolveVisibleCount(raw, floor, total)).toBe(18);
    raw = step(raw, floor, batch, total);
    expect(resolveVisibleCount(raw, floor, total)).toBe(20); // clamped, not 24
  });
});

describe("reveal config sanity", () => {
  it("uncaps desktop so large viewports never show a reveal button", () => {
    for (const cfg of [GALLERY_REVEAL, PARTY_REVEAL]) {
      expect(cfg.initial.desktop).toBe(REVEAL_ALL);
      const visible = resolveVisibleCount(0, cfg.initial.desktop, 30);
      expect(visible).toBe(30); // hasMore would be false
    }
  });

  it("keeps mobile budgets small and tablet budgets larger", () => {
    for (const cfg of [GALLERY_REVEAL, PARTY_REVEAL]) {
      expect(cfg.initial.mobile).toBeLessThan(cfg.initial.tablet);
      expect(cfg.initial.mobile).toBeGreaterThan(0);
    }
  });
});
