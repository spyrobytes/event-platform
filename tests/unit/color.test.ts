import { describe, it, expect } from "vitest";
import { isLightColor, mostReadable } from "@/lib/color";

describe("isLightColor", () => {
  it("is true for light/mid colors (dark text reads better)", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#f8f5f0")).toBe(true); // Grand Luxe "Light" swatch
    expect(isLightColor("#55a1bf")).toBe(true); // Cerulean (mid-tone) panel
  });

  it("is false for dark colors (white reads better)", () => {
    expect(isLightColor("#000000")).toBe(false);
    expect(isLightColor("#34005B")).toBe(false); // Amethyst panel
    expect(isLightColor("#0E2E26")).toBe(false); // Emerald Noir panel
  });
});

describe("mostReadable", () => {
  it("returns whichever ink has more contrast on the background", () => {
    // White over a near-black ink wins on a dark fill.
    expect(mostReadable("#34005B", "#ffffff", "#111111")).toBe("#ffffff");
    // A dark ink wins over white on a light fill.
    expect(mostReadable("#55a1bf", "#ffffff", "#1a1a1a")).toBe("#1a1a1a");
    // Mirrors the factory's accent-ink pick: white on a deep-navy accent fill.
    expect(mostReadable("#0a1f2b", "#ffffff", "#55a1bf")).toBe("#ffffff");
  });
});
