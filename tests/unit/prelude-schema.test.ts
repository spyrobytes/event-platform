import { describe, it, expect } from "vitest";
import { preludeSchema } from "@/schemas/event-page";

// The interesting validation in preludeSchema is the refine: body must be at
// least 40 characters, but only when enabled. These four cases lock that
// invariant so disabled drafts can persist with empty content while enabled
// publishes can't slip through with too-short notes.

describe("preludeSchema refine (conditional min-length)", () => {
  const FOURTY_CHARS = "A".repeat(40);
  const THIRTY_NINE_CHARS = "A".repeat(39);

  it("rejects an enabled prelude with empty body", () => {
    const result = preludeSchema.safeParse({
      enabled: true,
      body: "",
      font: "romantic-script",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an enabled prelude with body just below the min (39 chars)", () => {
    const result = preludeSchema.safeParse({
      enabled: true,
      body: THIRTY_NINE_CHARS,
      font: "romantic-script",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an enabled prelude with body at the min (40 chars)", () => {
    const result = preludeSchema.safeParse({
      enabled: true,
      body: FOURTY_CHARS,
      font: "romantic-script",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a disabled prelude with empty body (draft state)", () => {
    const result = preludeSchema.safeParse({
      enabled: false,
      body: "",
      font: "romantic-script",
    });
    expect(result.success).toBe(true);
  });
});
