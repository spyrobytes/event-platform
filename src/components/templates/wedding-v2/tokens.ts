/**
 * Wedding V2 Design Tokens
 *
 * Full variable system matching the cinematic POC:
 * - Warm neutral palette (ivory → night)
 * - Accent greens (sage family) and golds
 * - Clamp-based responsive typography
 * - Spacing, radius, shadows, easing
 * - Semantic mappings (bg, surface, text, accent, etc.)
 */

export const V2 = {
  // Warm neutrals
  ivory: "#f8f5f0",
  cream: "#f0ebe3",
  linen: "#e8e1d6",
  sand: "#d4cabb",
  stone: "#a69e93",
  earth: "#786f65",
  charcoal: "#3d3830",
  night: "#1e1b17",

  // Greens
  sage: "#7a8c72",
  sageLight: "#a8b8a0",
  sageDark: "#5c6b55",
  forest: "#3f4f3a",

  // Accents
  gold: "#c5a55a",
  goldLight: "#ddc07a",
  goldDark: "#9e7e3a",
  rose: "#c4918a",

  // Fonts (defaults — overridden by fontPair)
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
} as const;

/**
 * Font pair mappings for V2 template.
 * Each pair provides a serif heading font and a sans body font.
 */
export type V2FontPair = "serif_sans" | "modern" | "classic";

const FONT_PAIRS: Record<V2FontPair, { serif: string; sans: string }> = {
  serif_sans: {
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  modern: {
    serif: "'DM Sans', system-ui, -apple-system, sans-serif",
    sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  classic: {
    serif: "'Playfair Display', Georgia, serif",
    sans: "'Source Serif 4', Georgia, serif",
  },
};

export function resolveV2Fonts(fontPair?: string): { serif: string; sans: string } {
  if (fontPair && fontPair in FONT_PAIRS) {
    return FONT_PAIRS[fontPair as V2FontPair];
  }
  return FONT_PAIRS.serif_sans;
}

/**
 * Full CSS variable map applied to the root article element.
 * Matches the POC's :root block exactly.
 */
export function getV2CSSVariables(primaryColor?: string, fontPair?: string): Record<string, string> {
  const accent = primaryColor || V2.sage;
  const fonts = resolveV2Fonts(fontPair);

  return {
    // Raw palette
    "--ivory": V2.ivory,
    "--cream": V2.cream,
    "--linen": V2.linen,
    "--sand": V2.sand,
    "--stone": V2.stone,
    "--earth": V2.earth,
    "--charcoal": V2.charcoal,
    "--night": V2.night,
    "--sage": V2.sage,
    "--sage-l": V2.sageLight,
    "--sage-d": V2.sageDark,
    "--forest": V2.forest,
    "--gold": V2.gold,
    "--gold-l": V2.goldLight,
    "--gold-d": V2.goldDark,
    "--rose": V2.rose,

    // Semantic
    "--bg": V2.ivory,
    "--surface": "#ffffff",
    "--text": V2.charcoal,
    "--text-2": V2.earth,
    "--text-3": V2.stone,
    "--border": V2.linen,
    "--accent": accent,
    "--accent-2": V2.gold,

    // Typography (clamp-based responsive)
    "--serif": fonts.serif,
    "--sans": fonts.sans,
    "--h1": "clamp(2.8rem, 6vw, 5.4rem)",
    "--h2": "clamp(1.8rem, 3.2vw, 2.8rem)",
    "--h3": "clamp(1.15rem, 1.6vw, 1.35rem)",
    "--body": "clamp(0.95rem, 1.1vw, 1.05rem)",
    "--sm": "clamp(0.82rem, 0.9vw, 0.88rem)",

    // Spacing
    "--section-y": "clamp(72px, 10vw, 120px)",
    "--gap": "clamp(16px, 2.5vw, 28px)",
    "--max": "1140px",
    "--pad": "clamp(20px, 4vw, 40px)",

    // Radius
    "--r": "16px",
    "--r-lg": "24px",

    // Shadows
    "--shadow": "0 2px 16px rgba(30,27,23,.05), 0 1px 3px rgba(30,27,23,.04)",
    "--shadow-lg": "0 8px 40px rgba(30,27,23,.09), 0 2px 8px rgba(30,27,23,.04)",
    "--shadow-xl": "0 20px 60px rgba(30,27,23,.12)",

    // Transitions & easing
    "--transition": ".3s cubic-bezier(.4,0,.2,1)",
    "--ease-out-expo": "cubic-bezier(.16,1,.3,1)",

    // Backward-compat aliases (used by some shared components)
    "--wedding-primary": accent,
    "--wedding-secondary": V2.gold,
    "--wedding-background": V2.ivory,
    "--wedding-surface": "#ffffff",
    "--wedding-text": V2.charcoal,
    "--wedding-text-muted": V2.earth,
    "--wedding-border": V2.linen,
    "--wedding-font-heading": fonts.serif,
    "--wedding-font-body": fonts.sans,
    "--wedding-heading-weight": "400",
    "--wedding-body-weight": "400",
    "--wedding-heading-letter-spacing": "0.02em",
    "--wedding-body-line-height": "1.7",
    "--wedding-accent": accent,
  };
}

/**
 * Convert CSS variable map to inline style object
 */
export function v2TokensToInline(
  cssVariables: Record<string, string>
): React.CSSProperties {
  return cssVariables as React.CSSProperties;
}

// Re-export old name for backward compat
export const WEDDING_V2_PALETTE = {
  ivory: V2.ivory,
  cream: V2.cream,
  sage: V2.sage,
  gold: V2.gold,
  forest: V2.forest,
  text: V2.charcoal,
  textMuted: V2.earth,
  border: V2.linen,
} as const;
