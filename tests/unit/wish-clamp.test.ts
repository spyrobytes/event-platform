import { describe, it, expect } from "vitest";
import {
  estimateWishLines,
  wishNeedsClamp,
  WISH_CLAMP_LINES,
} from "@/components/templates/wedding-v3/renderers/wishes/wish-clamp";

describe("estimateWishLines", () => {
  it("counts a short one-liner as a single line", () => {
    expect(estimateWishLines("Congratulations! ❤️")).toBe(1);
  });

  it("counts forced line breaks (pre-wrap renders them as lines)", () => {
    // 4 segments, each short enough to fit one line — including the empty
    // segment from the blank line, which still produces a line box.
    expect(estimateWishLines("Two hearts,\none home.\n\nCongrats!")).toBe(4);
  });

  it("counts soft wraps of long unbroken text", () => {
    // 500 chars with no breaks ≈ 10 estimated lines at 50 chars/line
    expect(estimateWishLines("x".repeat(500))).toBe(10);
  });

  it("combines forced breaks and soft wraps", () => {
    // 120-char segment (3 lines) + 1-char segment (1 line)
    expect(estimateWishLines(`${"x".repeat(120)}\ny`)).toBe(4);
  });
});

describe("wishNeedsClamp", () => {
  it("does not clamp short messages", () => {
    expect(wishNeedsClamp("So happy for you two!")).toBe(false);
  });

  it("does not clamp a message that exactly fills the visible lines", () => {
    // WISH_CLAMP_LINES forced lines, each fitting one line — everything is
    // visible when clamped, so a toggle would reveal nothing.
    const exactlyFull = Array.from({ length: WISH_CLAMP_LINES }, () => "line").join("\n");
    expect(wishNeedsClamp(exactlyFull)).toBe(false);
  });

  it("clamps a schema-max unbroken message", () => {
    expect(wishNeedsClamp("x".repeat(1000))).toBe(true);
  });

  it("clamps a short message with many manual line breaks", () => {
    const poem = Array.from({ length: WISH_CLAMP_LINES + 2 }, () => "word").join("\n");
    expect(wishNeedsClamp(poem)).toBe(true);
  });
});
