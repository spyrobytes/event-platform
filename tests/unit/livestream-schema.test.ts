import { describe, it, expect } from "vitest";
import { livestreamSectionDataSchema } from "@/schemas/event-page";

// Anchor at a fixed point so test timestamps are deterministic regardless
// of when the suite runs.
const ANCHOR = Date.parse("2026-06-20T17:00:00Z");
const ONE_HOUR = 60 * 60 * 1000;

const iso = (offsetMs: number) => new Date(ANCHOR + offsetMs).toISOString();

describe("livestreamSectionDataSchema cross-field validation", () => {
  it("accepts startAt before endAt", () => {
    const result = livestreamSectionDataSchema.safeParse({
      startAt: iso(0),
      endAt: iso(ONE_HOUR),
    });
    expect(result.success).toBe(true);
  });

  it("rejects endAt equal to startAt", () => {
    const result = livestreamSectionDataSchema.safeParse({
      startAt: iso(0),
      endAt: iso(0),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "endAt");
      expect(issue?.message).toMatch(/after the start time|after start time/i);
    }
  });

  it("rejects endAt before startAt", () => {
    const result = livestreamSectionDataSchema.safeParse({
      startAt: iso(ONE_HOUR),
      endAt: iso(0),
    });
    expect(result.success).toBe(false);
  });

  it("accepts only startAt (no endAt)", () => {
    const result = livestreamSectionDataSchema.safeParse({
      startAt: iso(0),
    });
    expect(result.success).toBe(true);
  });

  it("accepts only endAt (no startAt)", () => {
    const result = livestreamSectionDataSchema.safeParse({
      endAt: iso(0),
    });
    expect(result.success).toBe(true);
  });

  it("accepts the empty/draft case (no timing)", () => {
    const result = livestreamSectionDataSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
