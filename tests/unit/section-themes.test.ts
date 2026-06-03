import { describe, it, expect } from "vitest";
import { getSectionThemeVariables } from "@/components/templates/wedding-v3/theme-packs/section-themes";
import { getContrastRatio } from "@/lib/color";

// Representative themes from definitions/grand-luxe.ts
const AMETHYST = { id: "amethyst", label: "Amethyst", panel: "#34005B" };
const EMERALD = { id: "emerald-noir", label: "Emerald Noir", panel: "#0E2E26" };
const CERULEAN = {
  id: "cerulean",
  label: "Cerulean",
  panel: "#55a1bf",
  accent: "#0a1f2b",
};

describe("getSectionThemeVariables — dark panels (light-on-dark)", () => {
  it("emits the white-alpha ink ramp + light hairlines", () => {
    const v = getSectionThemeVariables(AMETHYST);
    expect(v["--lux-ink"]).toBe("rgba(255, 255, 255, 0.92)");
    expect(v["--lux-ink-soft"]).toBe("rgba(255, 255, 255, 0.62)");
    expect(v["--lux-ink-mid"]).toBe("rgba(255, 255, 255, 0.5)");
    expect(v["--lux-ink-faint"]).toBe("rgba(255, 255, 255, 0.4)");
    expect(v["--lux-line"]).toBe("rgba(255, 255, 255, 0.12)");
    expect(v["--lux-card"]).toBe("rgba(255, 255, 255, 0.06)");
    // The light-panel-only token must NOT appear (zero regression for the band).
    expect(v["--lux-num-ink"]).toBeUndefined();
  });

  it("emits hero tokens equal to the body values the hero previously read", () => {
    // Guarantees the hero is byte-unchanged for dark themes after the rewire.
    const v = getSectionThemeVariables(AMETHYST);
    expect(v["--lux-hero-surface"]).toBe(v["--lux-panel"]); // was var(--lux-panel)
    expect(v["--lux-hero-ink-soft"]).toBe("rgba(255, 255, 255, 0.62)");
    expect(v["--lux-hero-ink-faint"]).toBe("rgba(255, 255, 255, 0.4)");
    expect(v["--lux-hero-line"]).toBe("rgba(255, 255, 255, 0.12)");
    // A dark panel's 60% tint is already a dark glass → unchanged.
    expect(v["--lux-glass"]).toContain("60%");
  });

  it("leaves accent unset when the theme does not pin one", () => {
    const v = getSectionThemeVariables(AMETHYST);
    expect(v["--lux-accent"]).toBeUndefined();
    expect(v["--lux-hero-accent"]).toBeUndefined();
  });

  it("treats Emerald Noir as a dark panel", () => {
    const v = getSectionThemeVariables(EMERALD);
    expect(v["--lux-ink"]).toBe("rgba(255, 255, 255, 0.92)");
    expect(v["--lux-num-ink"]).toBeUndefined();
    // Polarity decision: white reads better than black on this panel.
    expect(getContrastRatio(EMERALD.panel, "#ffffff")).toBeGreaterThan(
      getContrastRatio(EMERALD.panel, "#000000"),
    );
  });
});

describe("getSectionThemeVariables — light/mid panels (dark-on-light)", () => {
  it("flips the ink ramp to black-alpha and darkens the hairlines/cards", () => {
    const v = getSectionThemeVariables(CERULEAN);
    expect(v["--lux-ink"]).toBe("rgba(0, 0, 0, 0.95)");
    expect(v["--lux-ink-soft"]).toBe("rgba(0, 0, 0, 0.78)");
    expect(v["--lux-ink-mid"]).toBe("rgba(0, 0, 0, 0.68)");
    expect(v["--lux-ink-faint"]).toBe("rgba(0, 0, 0, 0.58)");
    expect(v["--lux-line"]).toBe("rgba(0, 0, 0, 0.14)");
    expect(v["--lux-card"]).toBe("rgba(0, 0, 0, 0.05)");
  });

  it("pins the dark accent and a dark countdown-number ink", () => {
    const v = getSectionThemeVariables(CERULEAN);
    expect(v["--lux-accent"]).toBe("#0a1f2b");
    expect(v["--lux-num-ink"]).toBe("rgba(0, 0, 0, 0.95)");
  });

  it("keeps the hero light-on-dark (decoupled from the panel polarity)", () => {
    const v = getSectionThemeVariables(CERULEAN);
    expect(v["--lux-hero-ink-soft"]).toBe("rgba(255, 255, 255, 0.72)");
    expect(v["--lux-hero-ink-faint"]).toBe("rgba(255, 255, 255, 0.45)");
    // Hero surface is a dark mix, never the light panel itself.
    expect(v["--lux-hero-surface"]).toContain("#0b0d10");
    // Hero accent left unset → flows to the live gold --accent over the photo,
    // NOT the body's dark ink (which would vanish on the hero glass).
    expect(v["--lux-hero-accent"]).toBeUndefined();
    // Glass goes dark (faintly tinted), NOT the light 60% panel veil — keeps
    // muted ink + the gold accent legible on the info cards.
    expect(v["--lux-glass"]).toContain("rgba(10, 12, 15, 0.72)");
    expect(v["--lux-glass"]).not.toContain("60%");
  });

  it("justifies the polarity flip with WCAG contrast", () => {
    // White text fails AA on cerulean; dark text clears it — hence the flip.
    expect(getContrastRatio(CERULEAN.panel, "#ffffff")).toBeLessThan(4.5);
    expect(getContrastRatio(CERULEAN.panel, "#000000")).toBeGreaterThan(4.5);
    // The pinned accent reads on the panel AND carries white CTA text.
    expect(getContrastRatio("#0a1f2b", CERULEAN.panel)).toBeGreaterThan(4.5);
    expect(getContrastRatio("#0a1f2b", "#ffffff")).toBeGreaterThan(4.5);
  });
});

describe("getSectionThemeVariables — malformed panel", () => {
  it("falls back to a safe dark panel (and its light-on-dark ramp)", () => {
    const v = getSectionThemeVariables({ id: "x", label: "x", panel: "nope" });
    expect(v["--lux-panel"]).toBe("#121110");
    expect(v["--lux-ink"]).toBe("rgba(255, 255, 255, 0.92)");
  });
});
