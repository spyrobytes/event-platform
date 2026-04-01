/**
 * V3 Theme Pack Token System
 *
 * Extends the V2 CSS variable generation with additional design tokens
 * for spacing scale, radius, shadows, and max-width that differ per template.
 */

import {
  getV2CSSVariables,
  getV2GlassVariables,
  getV2FontUrl,
  v2TokensToInline,
} from "../../wedding-v2/tokens";
import type { ThemePack, SpacingScale, RadiusScale, ShadowIntensity, MotionPreset } from "../types";

// ---------------------------------------------------------------------------
// Spacing scale mappings
// ---------------------------------------------------------------------------

const SPACING_SCALES: Record<SpacingScale, { sectionY: string; gap: string; pad: string }> = {
  compact: {
    sectionY: "clamp(48px, 7vw, 80px)",
    gap: "clamp(12px, 2vw, 20px)",
    pad: "clamp(16px, 3vw, 28px)",
  },
  balanced: {
    sectionY: "clamp(72px, 10vw, 120px)",
    gap: "clamp(16px, 2.5vw, 28px)",
    pad: "clamp(20px, 4vw, 40px)",
  },
  generous: {
    sectionY: "clamp(96px, 14vw, 160px)",
    gap: "clamp(20px, 3vw, 36px)",
    pad: "clamp(24px, 5vw, 48px)",
  },
};

// ---------------------------------------------------------------------------
// Radius scale mappings
// ---------------------------------------------------------------------------

const RADIUS_SCALES: Record<RadiusScale, { r: string; rLg: string }> = {
  sharp: { r: "4px", rLg: "8px" },
  soft: { r: "16px", rLg: "24px" },
  organic: { r: "24px", rLg: "40px" },
};

// ---------------------------------------------------------------------------
// Shadow intensity mappings
// ---------------------------------------------------------------------------

const SHADOW_SCALES: Record<ShadowIntensity, { shadow: string; shadowLg: string; shadowXl: string }> = {
  none: {
    shadow: "none",
    shadowLg: "none",
    shadowXl: "none",
  },
  subtle: {
    shadow: "0 2px 16px rgba(30,27,23,.05), 0 1px 3px rgba(30,27,23,.04)",
    shadowLg: "0 8px 40px rgba(30,27,23,.09), 0 2px 8px rgba(30,27,23,.04)",
    shadowXl: "0 20px 60px rgba(30,27,23,.12)",
  },
  medium: {
    shadow: "0 4px 20px rgba(30,27,23,.08), 0 1px 4px rgba(30,27,23,.06)",
    shadowLg: "0 12px 48px rgba(30,27,23,.12), 0 4px 12px rgba(30,27,23,.06)",
    shadowXl: "0 24px 72px rgba(30,27,23,.16)",
  },
  dramatic: {
    shadow: "0 6px 28px rgba(30,27,23,.12), 0 2px 6px rgba(30,27,23,.08)",
    shadowLg: "0 16px 56px rgba(30,27,23,.18), 0 6px 16px rgba(30,27,23,.08)",
    shadowXl: "0 32px 88px rgba(30,27,23,.22)",
  },
};

// ---------------------------------------------------------------------------
// Motion preset → CSS variable mappings
// ---------------------------------------------------------------------------

export function getMotionCSSVariables(preset: MotionPreset): Record<string, string> {
  return {
    "--motion-duration": `${preset.duration}ms`,
    "--motion-easing": preset.easing,
    "--motion-stagger": `${preset.staggerDelay}ms`,
  };
}

// ---------------------------------------------------------------------------
// Main: Generate full CSS variable map from ThemePack + MotionPreset
// ---------------------------------------------------------------------------

export function getV3CSSVariables(
  themePack: ThemePack,
  primaryColor?: string,
  motionPreset?: MotionPreset,
): Record<string, string> {
  // Start with V2 base variables (palette + fonts + typography)
  const baseVars = getV2CSSVariables(primaryColor, themePack.fontPair, themePack.palette);

  // Override spacing scale
  const spacing = SPACING_SCALES[themePack.spacingScale];
  baseVars["--section-y"] = spacing.sectionY;
  baseVars["--gap"] = spacing.gap;
  baseVars["--pad"] = spacing.pad;

  // Override max width
  baseVars["--max"] = themePack.maxWidth;

  // Override radius
  const radius = RADIUS_SCALES[themePack.radiusScale];
  baseVars["--r"] = radius.r;
  baseVars["--r-lg"] = radius.rLg;

  // Override shadows
  const shadows = SHADOW_SCALES[themePack.shadowIntensity];
  baseVars["--shadow"] = shadows.shadow;
  baseVars["--shadow-lg"] = shadows.shadowLg;
  baseVars["--shadow-xl"] = shadows.shadowXl;

  // Add motion variables
  if (motionPreset) {
    Object.assign(baseVars, getMotionCSSVariables(motionPreset));
  }

  return baseVars;
}

export function getV3GlassVariables(themePack: ThemePack): Record<string, string> {
  return getV2GlassVariables(themePack.glass);
}

export function getV3FontUrl(themePack: ThemePack): string {
  return getV2FontUrl(themePack.fontPair);
}

export { v2TokensToInline as tokensToInline };
