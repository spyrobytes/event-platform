import { describe, it, expect } from "vitest";
import { getLivestreamPhase } from "@/components/features/Livestream/types";

// Pin "now" for deterministic boundary testing.
const NOW = Date.parse("2026-06-20T17:00:00Z");
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MIN_MS = 60 * 1000;

const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe("getLivestreamPhase", () => {
  describe("no timing data", () => {
    it("returns 'ready' when neither startAt nor endAt is set", () => {
      // Always-on stream — organizer pasted a URL but didn't schedule.
      expect(getLivestreamPhase({}, NOW)).toBe("ready");
    });

    it("returns 'ready' even when nowMs is 0 (SSR placeholder) with no startAt", () => {
      expect(getLivestreamPhase({}, 0)).toBe("ready");
    });
  });

  describe("with startAt only", () => {
    it("returns 'before' when startAt is in the future", () => {
      expect(getLivestreamPhase({ startAt: iso(ONE_HOUR_MS) }, NOW)).toBe("before");
    });

    it("returns 'ready' when startAt has passed", () => {
      expect(getLivestreamPhase({ startAt: iso(-ONE_HOUR_MS) }, NOW)).toBe("ready");
    });

    it("returns 'ready' exactly at startAt boundary (nowMs >= startMs)", () => {
      const at = iso(0);
      expect(getLivestreamPhase({ startAt: at }, NOW)).toBe("ready");
    });

    it("returns 'before' when nowMs is 0 (SSR placeholder) and startAt is set", () => {
      // Server's first paint can't peek at actual time; defaulting to
      // "before" matches the most common viewer state (looking ahead of
      // a scheduled stream) and avoids briefly flashing the player.
      expect(getLivestreamPhase({ startAt: iso(ONE_HOUR_MS) }, 0)).toBe("before");
    });
  });

  describe("with endAt only", () => {
    it("returns 'ended' when endAt has passed", () => {
      expect(getLivestreamPhase({ endAt: iso(-ONE_MIN_MS) }, NOW)).toBe("ended");
    });

    it("returns 'ready' when endAt is in the future (no startAt = always-on)", () => {
      expect(getLivestreamPhase({ endAt: iso(ONE_HOUR_MS) }, NOW)).toBe("ready");
    });

    it("returns 'ended' exactly at endAt boundary (nowMs >= endMs)", () => {
      const at = iso(0);
      expect(getLivestreamPhase({ endAt: at }, NOW)).toBe("ended");
    });
  });

  describe("with both startAt and endAt", () => {
    it("returns 'before' when both boundaries are in the future", () => {
      expect(
        getLivestreamPhase(
          { startAt: iso(ONE_HOUR_MS), endAt: iso(ONE_HOUR_MS * 2) },
          NOW
        )
      ).toBe("before");
    });

    it("returns 'ready' when start has passed and end is in the future", () => {
      expect(
        getLivestreamPhase(
          { startAt: iso(-ONE_MIN_MS), endAt: iso(ONE_HOUR_MS) },
          NOW
        )
      ).toBe("ready");
    });

    it("returns 'ended' when both have passed", () => {
      expect(
        getLivestreamPhase(
          { startAt: iso(-ONE_HOUR_MS * 2), endAt: iso(-ONE_HOUR_MS) },
          NOW
        )
      ).toBe("ended");
    });

    it("ended takes precedence over before when endAt < startAt (corrupt data)", () => {
      // Defensive: prefer "ended" over rendering the countdown for past
      // endAt + future startAt. Sane fallback if a save somehow flips dates.
      expect(
        getLivestreamPhase(
          { startAt: iso(ONE_HOUR_MS), endAt: iso(-ONE_HOUR_MS) },
          NOW
        )
      ).toBe("ended");
    });
  });

  describe("invalid ISO strings", () => {
    it("ignores invalid startAt and falls through to 'ready'", () => {
      expect(getLivestreamPhase({ startAt: "not-a-date" }, NOW)).toBe("ready");
    });

    it("ignores invalid endAt and falls through to next branch", () => {
      expect(
        getLivestreamPhase(
          { startAt: iso(-ONE_HOUR_MS), endAt: "garbage" },
          NOW
        )
      ).toBe("ready");
    });

    it("ignores both invalid values and returns 'ready'", () => {
      expect(
        getLivestreamPhase({ startAt: "x", endAt: "y" }, NOW)
      ).toBe("ready");
    });
  });
});
