import { describe, it, expect, beforeAll } from "vitest";

// env.ts bypasses validation in NODE_ENV=test and returns process.env directly,
// so seeding the pepper here is enough.
beforeAll(() => {
  process.env.RSVP_CODE_HMAC_KEY = "test-pepper-with-at-least-32-characters-padding";
});

const {
  generateGuestRsvpCode,
  normalizeRsvpCode,
  hashRsvpCode,
} = await import("@/lib/rsvp-code");

describe("generateGuestRsvpCode", () => {
  it("produces EVG-XXXX-XXXX-XXXX format", () => {
    const code = generateGuestRsvpCode();
    expect(code).toMatch(/^EVG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("excludes confusing characters (I, O, 0, 1, L)", () => {
    // Sample a few hundred codes; statistically guarantees we'd see a banned
    // char if the alphabet were wrong.
    for (let i = 0; i < 200; i++) {
      const code = generateGuestRsvpCode();
      expect(code).not.toMatch(/[IOL01]/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateGuestRsvpCode()));
    expect(codes.size).toBe(100);
  });
});

describe("normalizeRsvpCode", () => {
  it("uppercases lowercase input", () => {
    expect(normalizeRsvpCode("evg-abcd-efgh-ijkl")).toBe("EVGABCDEFGHIJKL");
  });

  it("strips hyphens", () => {
    expect(normalizeRsvpCode("EVG-ABCD-EFGH-IJKL")).toBe("EVGABCDEFGHIJKL");
  });

  it("strips surrounding whitespace", () => {
    expect(normalizeRsvpCode("  EVG-ABCD  ")).toBe("EVGABCD");
  });

  it("strips internal whitespace and punctuation", () => {
    expect(normalizeRsvpCode("EVG ABCD.EFGH/IJKL")).toBe("EVGABCDEFGHIJKL");
  });

  it("handles mixed case + hyphens + spaces in one pass", () => {
    expect(normalizeRsvpCode("  evg-AbCd EfGh-IjKl ")).toBe("EVGABCDEFGHIJKL");
  });

  it("returns empty string for input with no alphanumerics", () => {
    expect(normalizeRsvpCode("---  ---")).toBe("");
  });
});

describe("hashRsvpCode", () => {
  it("is deterministic for the same input", () => {
    const a = hashRsvpCode("EVG-ABCD-EFGH-IJKL");
    const b = hashRsvpCode("EVG-ABCD-EFGH-IJKL");
    expect(a).toBe(b);
  });

  it("normalizes before hashing — formatting variants collide", () => {
    const formatted = hashRsvpCode("EVG-ABCD-EFGH-IJKL");
    const lowercase = hashRsvpCode("evg-abcd-efgh-ijkl");
    const noHyphens = hashRsvpCode("EVGABCDEFGHIJKL");
    const padded = hashRsvpCode("  EVG-ABCD-EFGH-IJKL  ");
    expect(lowercase).toBe(formatted);
    expect(noHyphens).toBe(formatted);
    expect(padded).toBe(formatted);
  });

  it("produces different hashes for different codes", () => {
    expect(hashRsvpCode("EVG-AAAA-AAAA-AAAA")).not.toBe(
      hashRsvpCode("EVG-BBBB-BBBB-BBBB")
    );
  });

  it("produces 64-character hex (SHA-256)", () => {
    const hash = hashRsvpCode("EVG-ABCD-EFGH-IJKL");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("different peppers produce different hashes", () => {
    const original = hashRsvpCode("EVG-ABCD-EFGH-IJKL");

    process.env.RSVP_CODE_HMAC_KEY = "different-pepper-with-at-least-32-chars-padding";
    try {
      // env Proxy reads process.env on each access in NODE_ENV=test, so the
      // existing function picks up the rotated pepper without re-importing.
      expect(hashRsvpCode("EVG-ABCD-EFGH-IJKL")).not.toBe(original);
    } finally {
      // Always restore even if the assertion above throws.
      process.env.RSVP_CODE_HMAC_KEY = "test-pepper-with-at-least-32-characters-padding";
    }
  });

  it("throws a clear error when the pepper is missing", () => {
    const saved = process.env.RSVP_CODE_HMAC_KEY;
    delete process.env.RSVP_CODE_HMAC_KEY;
    try {
      expect(() => hashRsvpCode("EVG-ABCD-EFGH-IJKL")).toThrow(
        /RSVP_CODE_HMAC_KEY is not configured/
      );
    } finally {
      process.env.RSVP_CODE_HMAC_KEY = saved;
    }
  });
});
