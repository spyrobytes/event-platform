/**
 * Invitation Theme Tokens
 *
 * Defines color palettes and typography for elegant wedding invitations.
 * These CSS variables are applied inline to prevent theme flicker.
 */

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

// Subtle noise pattern as inline SVG (no external files needed)
const PAPER_TEXTURE_LIGHT = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`;
const PAPER_TEXTURE_DARK = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`;

export const themes = {
  ivory: {
    "--inv-paper-bg": "#FFFFF8",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#2C2C2C",
    "--inv-text-secondary": "#6B6B6B",
    "--inv-accent": "#D4AF37",
    "--inv-envelope-color": "#F5F5DC",
    "--inv-card-bg": "#FFFEF9",
    "--inv-border": "#E8E4D9",
  },
  blush: {
    "--inv-paper-bg": "#FFF5F5",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#4A4A4A",
    "--inv-text-secondary": "#8A8A8A",
    "--inv-accent": "#D4A5A5",
    "--inv-envelope-color": "#FFE4E4",
    "--inv-card-bg": "#FFFAFA",
    "--inv-border": "#F0D8D8",
  },
  sage: {
    "--inv-paper-bg": "#F5F8F5",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#3A4A3A",
    "--inv-text-secondary": "#6A7A6A",
    "--inv-accent": "#8B9B8B",
    "--inv-envelope-color": "#E8EDE8",
    "--inv-card-bg": "#FAFCFA",
    "--inv-border": "#D0DDD0",
  },
  midnight: {
    "--inv-paper-bg": "#1A1A2E",
    "--inv-paper-texture": PAPER_TEXTURE_DARK,
    "--inv-text-primary": "#EEEEF0",
    "--inv-text-secondary": "#B8B8C0",
    "--inv-accent": "#FFD700",
    "--inv-envelope-color": "#252540",
    "--inv-card-bg": "#2A2A40",
    "--inv-border": "#3A3A50",
  },
  champagne: {
    "--inv-paper-bg": "#F7F3E9",
    "--inv-paper-texture": PAPER_TEXTURE_LIGHT,
    "--inv-text-primary": "#4A3F35",
    "--inv-text-secondary": "#7A6F65",
    "--inv-accent": "#C9A961",
    "--inv-envelope-color": "#E8DFC8",
    "--inv-card-bg": "#FAF6ED",
    "--inv-border": "#D8CFC0",
  },
} as const;

export type ThemeId = keyof typeof themes;
export type ThemeTokens = (typeof themes)[ThemeId];

// =============================================================================
// TYPOGRAPHY PAIRS
// =============================================================================

/**
 * Font family definitions for invitation typography.
 * Each pair includes heading, script, and body fonts.
 */
export const typographyPairs = {
  classic: {
    heading: "'Playfair Display', 'Times New Roman', serif",
    script: "'Dancing Script', cursive, serif",
    body: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  modern: {
    heading: "'Montserrat', -apple-system, sans-serif",
    script: "'Allura', cursive, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  traditional: {
    heading: "'Cormorant Garamond', 'Times New Roman', serif",
    script: "'Great Vibes', cursive, serif",
    body: "'Crimson Text', 'Times New Roman', serif",
  },
} as const;

export type TypographyPair = keyof typeof typographyPairs;
export type TypographyTokens = (typeof typographyPairs)[TypographyPair];

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Generates inline CSS string for theme tokens.
 * Used to apply theme without flicker on SSR.
 */
export function getThemeStyleString(themeId: ThemeId): string {
  const tokens = themes[themeId];
  if (!tokens) {
    console.warn(`Unknown theme ID: ${themeId}, falling back to ivory`);
    return getThemeStyleString("ivory");
  }

  return Object.entries(tokens)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

/**
 * Generates typography CSS variables for a typography pair.
 */
export function getTypographyStyleString(pair: TypographyPair): string {
  const fonts = typographyPairs[pair];
  if (!fonts) {
    console.warn(`Unknown typography pair: ${pair}, falling back to classic`);
    return getTypographyStyleString("classic");
  }

  return [
    `--inv-font-heading: ${fonts.heading}`,
    `--inv-font-script: ${fonts.script}`,
    `--inv-font-body: ${fonts.body}`,
  ].join("; ");
}

/**
 * Generates complete style string for theme + typography.
 */
export function getInvitationStyleString(
  themeId: ThemeId,
  typography: TypographyPair
): string {
  return `${getThemeStyleString(themeId)}; ${getTypographyStyleString(typography)}`;
}

/**
 * Returns theme tokens as an object (for use in JavaScript).
 */
export function getThemeTokens(themeId: ThemeId): ThemeTokens {
  return themes[themeId] ?? themes.ivory;
}

/**
 * Returns typography tokens as an object.
 */
export function getTypographyTokens(pair: TypographyPair): TypographyTokens {
  return typographyPairs[pair] ?? typographyPairs.classic;
}

/**
 * Returns invitation style as a React-compatible style object.
 * Use this for inline styles in React components.
 */
export function getInvitationStyleObject(
  themeId: ThemeId,
  typography: TypographyPair
): React.CSSProperties {
  const themeTokens = themes[themeId] ?? themes.ivory;
  const fonts = typographyPairs[typography] ?? typographyPairs.classic;

  return {
    "--inv-paper-bg": themeTokens["--inv-paper-bg"],
    "--inv-paper-texture": themeTokens["--inv-paper-texture"],
    "--inv-text-primary": themeTokens["--inv-text-primary"],
    "--inv-text-secondary": themeTokens["--inv-text-secondary"],
    "--inv-accent": themeTokens["--inv-accent"],
    "--inv-envelope-color": themeTokens["--inv-envelope-color"],
    "--inv-card-bg": themeTokens["--inv-card-bg"],
    "--inv-border": themeTokens["--inv-border"],
    "--inv-font-heading": fonts.heading,
    "--inv-font-script": fonts.script,
    "--inv-font-body": fonts.body,
  } as React.CSSProperties;
}

// =============================================================================
// THEME METADATA (for UI display)
// =============================================================================

export const themeMetadata: Record<
  ThemeId,
  { name: string; description: string }
> = {
  ivory: {
    name: "Ivory",
    description: "Classic elegance with warm cream tones",
  },
  blush: {
    name: "Blush",
    description: "Soft romantic pink palette",
  },
  sage: {
    name: "Sage",
    description: "Natural, earthy green tones",
  },
  midnight: {
    name: "Midnight",
    description: "Dramatic dark theme with gold accents",
  },
  champagne: {
    name: "Champagne",
    description: "Warm golden sophistication",
  },
};

export const typographyMetadata: Record<
  TypographyPair,
  { name: string; description: string }
> = {
  classic: {
    name: "Classic",
    description: "Playfair Display + Dancing Script",
  },
  modern: {
    name: "Modern",
    description: "Montserrat + Allura",
  },
  traditional: {
    name: "Traditional",
    description: "Cormorant Garamond + Great Vibes",
  },
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Type guard for valid theme IDs
 */
export function isValidThemeId(id: string): id is ThemeId {
  return id in themes;
}

/**
 * Type guard for valid typography pairs
 */
export function isValidTypographyPair(pair: string): pair is TypographyPair {
  return pair in typographyPairs;
}
