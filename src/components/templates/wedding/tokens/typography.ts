/**
 * Wedding Template Typography
 *
 * Font pairings designed for wedding aesthetics.
 * Each pairing includes a heading and body font.
 */

export type FontPairing = {
  id: string;
  name: string;
  /** CSS font-family for headings */
  heading: string;
  /** CSS font-family for body text */
  body: string;
  /** Font weight for headings */
  headingWeight: number;
  /** Font weight for body */
  bodyWeight: number;
  /** Letter spacing for headings */
  headingLetterSpacing: string;
  /** Line height for body text */
  bodyLineHeight: number;
};

/**
 * Available font pairings
 *
 * Using system fonts and Google Fonts that work well for weddings.
 * Fonts are loaded via next/font in the layout.
 */
export const FONT_PAIRINGS: Record<string, FontPairing> = {
  // Classic - Elegant serif pairing
  classic_serif: {
    id: "classic_serif",
    name: "Classic Serif",
    heading: "'Playfair Display', Georgia, serif",
    body: "'Source Serif 4', Georgia, serif",
    headingWeight: 500,
    bodyWeight: 400,
    headingLetterSpacing: "0.01em",
    bodyLineHeight: 1.7,
  },

  // Modern - Clean sans-serif
  modern_sans: {
    id: "modern_sans",
    name: "Modern Sans",
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    headingWeight: 600,
    bodyWeight: 400,
    headingLetterSpacing: "-0.02em",
    bodyLineHeight: 1.6,
  },

  // Romantic - Script heading with serif body
  romantic_script: {
    id: "romantic_script",
    name: "Romantic Script",
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lora', Georgia, serif",
    headingWeight: 400,
    bodyWeight: 400,
    headingLetterSpacing: "0.02em",
    bodyLineHeight: 1.75,
  },

  // Rustic - Warm, approachable fonts
  rustic_warm: {
    id: "rustic_warm",
    name: "Rustic Warm",
    heading: "'Libre Baskerville', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    headingWeight: 400,
    bodyWeight: 400,
    headingLetterSpacing: "0.01em",
    bodyLineHeight: 1.65,
  },

  // Minimal - Ultra-clean typography
  minimal_clean: {
    id: "minimal_clean",
    name: "Minimal Clean",
    heading: "'DM Sans', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
    headingWeight: 500,
    bodyWeight: 400,
    headingLetterSpacing: "-0.01em",
    bodyLineHeight: 1.6,
  },
};

/**
 * Get a font pairing by ID
 */
export function getFontPairing(pairingId: string): FontPairing {
  return FONT_PAIRINGS[pairingId] || FONT_PAIRINGS.classic_serif;
}

/**
 * Generate CSS custom properties from a font pairing
 */
export function fontPairingToCSS(pairing: FontPairing): Record<string, string> {
  return {
    "--wedding-font-heading": pairing.heading,
    "--wedding-font-body": pairing.body,
    "--wedding-heading-weight": String(pairing.headingWeight),
    "--wedding-body-weight": String(pairing.bodyWeight),
    "--wedding-heading-letter-spacing": pairing.headingLetterSpacing,
    "--wedding-body-line-height": String(pairing.bodyLineHeight),
  };
}

/**
 * Map variant IDs to their default font pairings
 */
export const VARIANT_FONT_DEFAULTS: Record<string, string> = {
  classic: "classic_serif",
  modern_minimal: "minimal_clean",
  rustic_outdoor: "rustic_warm",
  destination: "modern_sans",
  intimate_micro: "romantic_script",
};

/**
 * Available font pairing IDs for validation
 */
export const AVAILABLE_FONT_IDS = Object.keys(FONT_PAIRINGS);
