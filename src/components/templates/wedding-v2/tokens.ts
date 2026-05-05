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
export type V2FontPair =
  | "serif_sans"
  | "modern"
  | "classic"
  | "playfair_dmsans"
  | "dmsans_sourceserif"
  | "cormorant_sourceserif";

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
  playfair_dmsans: {
    serif: "'Playfair Display', Georgia, serif",
    sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  dmsans_sourceserif: {
    serif: "'DM Sans', system-ui, -apple-system, sans-serif",
    sans: "'Source Serif 4', Georgia, serif",
  },
  cormorant_sourceserif: {
    serif: "'Cormorant Garamond', Georgia, serif",
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
 * Google Fonts URL for the selected font pair.
 * Each pair loads only the weights needed by the V2 template.
 */
const FONT_URLS: Record<V2FontPair, string> = {
  serif_sans:
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500;600;700&display=swap",
  modern:
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  classic:
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Source+Serif+4:wght@400;500&display=swap",
  playfair_dmsans:
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap",
  dmsans_sourceserif:
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;500&display=swap",
  cormorant_sourceserif:
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Source+Serif+4:wght@400;500&display=swap",
};

export function getV2FontUrl(fontPair?: string): string {
  if (fontPair && fontPair in FONT_URLS) {
    return FONT_URLS[fontPair as V2FontPair];
  }
  return FONT_URLS.serif_sans;
}

/**
 * Palette overrides type — allows variants to override any raw or semantic color.
 */
export type V2PaletteOverrides = Partial<{
  ivory: string;
  cream: string;
  linen: string;
  sand: string;
  stone: string;
  earth: string;
  charcoal: string;
  night: string;
  sage: string;
  sageLight: string;
  sageDark: string;
  forest: string;
  gold: string;
  goldLight: string;
  goldDark: string;
  rose: string;
  bg: string;
  surface: string;
  text: string;
  text2: string;
  text3: string;
  border: string;
  accent: string;
  accent2: string;
  // On-card overrides. Default to text/text-2/stone/cream. Used by Scrapbook
  // renderers for polaroid captions, flip-card content, and back-face surface
  // where a dark page bg coexists with light polaroid surfaces.
  textOnCard: string;
  text2OnCard: string;
  stoneOnCard: string;
  creamOnCard: string;
}>;

/**
 * Glass tokens for frosted/translucent UI elements.
 * Needed so dark-background variants can override the RGBA values.
 */
export type V2GlassTokens = {
  frostedBg: string;
  frostedBgScrolled: string;
  mobileNavBg: string;
  heroOverlayColor: string;
  accentTint?: string;
  accentHoverBg?: string;
};

/** Default glass tokens matching the current ivory-based design */
const DEFAULT_GLASS: V2GlassTokens = {
  frostedBg: "rgba(248, 245, 240, 0.55)",
  frostedBgScrolled: "rgba(248, 245, 240, 0.92)",
  mobileNavBg: "rgba(248, 245, 240, 0.97)",
  heroOverlayColor: V2.ivory,
  accentTint: "rgba(122, 140, 114, 0.08)",
  accentHoverBg: "rgba(122, 140, 114, 0.06)",
};

/**
 * Convert glass tokens to CSS custom properties.
 */
export function getV2GlassVariables(glass?: V2GlassTokens): Record<string, string> {
  const g = glass || DEFAULT_GLASS;
  return {
    "--glass-bg": g.frostedBg,
    "--glass-bg-scrolled": g.frostedBgScrolled,
    "--glass-bg-mobile": g.mobileNavBg,
    "--hero-overlay-color": g.heroOverlayColor,
    "--accent-tint": g.accentTint || DEFAULT_GLASS.accentTint!,
    "--accent-hover-bg": g.accentHoverBg || DEFAULT_GLASS.accentHoverBg!,
  };
}

/**
 * Full CSS variable map applied to the root article element.
 * Matches the POC's :root block exactly.
 *
 * @param primaryColor - User-selected accent color (overrides palette accent)
 * @param fontPair - Font pair identifier
 * @param paletteOverrides - Variant palette overrides (raw + semantic colors)
 */
export function getV2CSSVariables(
  primaryColor?: string,
  fontPair?: string,
  paletteOverrides?: V2PaletteOverrides,
): Record<string, string> {
  const p = paletteOverrides || {};
  const fonts = resolveV2Fonts(fontPair);

  // Resolve raw palette (overrides take precedence)
  const ivory = p.ivory || V2.ivory;
  const cream = p.cream || V2.cream;
  const linen = p.linen || V2.linen;
  const sand = p.sand || V2.sand;
  const stone = p.stone || V2.stone;
  const earth = p.earth || V2.earth;
  const charcoal = p.charcoal || V2.charcoal;
  const night = p.night || V2.night;
  const sage = p.sage || V2.sage;
  const sageLight = p.sageLight || V2.sageLight;
  const sageDark = p.sageDark || V2.sageDark;
  const forest = p.forest || V2.forest;
  const gold = p.gold || V2.gold;
  const goldLight = p.goldLight || V2.goldLight;
  const goldDark = p.goldDark || V2.goldDark;
  const rose = p.rose || V2.rose;

  // Accent: primaryColor > palette override > sage default
  const accent = primaryColor || p.accent || sage;

  // Semantic colors (overrides take precedence over derived defaults)
  const bg = p.bg || ivory;
  const surface = p.surface || "#ffffff";
  const text = p.text || charcoal;
  const text2 = p.text2 || earth;
  const text3 = p.text3 || stone;
  const border = p.border || linen;
  const accent2 = p.accent2 || gold;
  const textOnCard = p.textOnCard || text;
  const text2OnCard = p.text2OnCard || text2;
  const stoneOnCard = p.stoneOnCard || stone;
  const creamOnCard = p.creamOnCard || cream;

  return {
    // Raw palette
    "--ivory": ivory,
    "--cream": cream,
    "--linen": linen,
    "--sand": sand,
    "--stone": stone,
    "--earth": earth,
    "--charcoal": charcoal,
    "--night": night,
    "--sage": sage,
    "--sage-l": sageLight,
    "--sage-d": sageDark,
    "--forest": forest,
    "--gold": gold,
    "--gold-l": goldLight,
    "--gold-d": goldDark,
    "--rose": rose,

    // Semantic
    "--bg": bg,
    "--surface": surface,
    "--text": text,
    "--text-2": text2,
    "--text-3": text3,
    "--border": border,
    "--accent": accent,
    "--accent-2": accent2,
    "--text-on-card": textOnCard,
    "--text-2-on-card": text2OnCard,
    "--stone-on-card": stoneOnCard,
    "--cream-on-card": creamOnCard,

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
    "--wedding-secondary": gold,
    "--wedding-background": bg,
    "--wedding-surface": surface,
    "--wedding-text": text,
    "--wedding-text-muted": text2,
    "--wedding-border": border,
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
