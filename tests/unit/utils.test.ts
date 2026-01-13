import { describe, it, expect } from "vitest";
import { cn, generateSlug, truncate, getInitials } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("handles undefined values", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("generateSlug", () => {
  it("converts text to lowercase", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(generateSlug("Hello! @World#")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  it("handles multiple spaces", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
  });

  it("trims whitespace", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles underscores", () => {
    expect(generateSlug("hello_world")).toBe("hello-world");
  });
});

describe("truncate", () => {
  it("returns text unchanged if shorter than max length", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates text with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("limits to 2 characters", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });
});
