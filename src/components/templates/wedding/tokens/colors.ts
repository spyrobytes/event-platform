/**
 * Wedding Template Color Palettes
 *
 * Each palette is carefully designed for wedding aesthetics
 * and meets WCAG AA contrast requirements.
 */

export type ColorPalette = {
  id: string;
  name: string;
  /** Primary accent color */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Background color */
  background: string;
  /** Surface/card background */
  surface: string;
  /** Primary text color */
  text: string;
  /** Muted/secondary text */
  textMuted: string;
  /** Border color */
  border: string;
};

/**
 * Core variant palettes
 */
export const COLOR_PALETTES: Record<string, ColorPalette> = {
  // Classic - Elegant rose gold and cream
  classic: {
    id: "classic",
    name: "Classic Elegance",
    primary: "#B76E79",
    secondary: "#D4A574",
    background: "#FFFAF8",
    surface: "#FFFFFF",
    text: "#2D2D2D",
    textMuted: "#6B6B6B",
    border: "#E8E0DC",
  },

  // Modern Minimal - Clean black and white with subtle warm accent
  modern_minimal: {
    id: "modern_minimal",
    name: "Modern Minimal",
    primary: "#1A1A1A",
    secondary: "#C9A962",
    background: "#FFFFFF",
    surface: "#FAFAFA",
    text: "#1A1A1A",
    textMuted: "#737373",
    border: "#E5E5E5",
  },

  // Rustic - Earthy sage and terracotta
  rustic: {
    id: "rustic",
    name: "Rustic Warmth",
    primary: "#7D8471",
    secondary: "#C4785C",
    background: "#FAF8F5",
    surface: "#FFFFFF",
    text: "#3D3D3D",
    textMuted: "#6B6B6B",
    border: "#E2DED8",
  },

  // Destination - Airy blue and sand
  destination: {
    id: "destination",
    name: "Destination Dreams",
    primary: "#4A7C94",
    secondary: "#D4B896",
    background: "#F8FBFC",
    surface: "#FFFFFF",
    text: "#2C3E4A",
    textMuted: "#6B7D87",
    border: "#DCE8ED",
  },

  // Intimate - Soft lavender and blush
  intimate: {
    id: "intimate",
    name: "Intimate Romance",
    primary: "#9B8AA5",
    secondary: "#E8B4B8",
    background: "#FDFAFC",
    surface: "#FFFFFF",
    text: "#3A3540",
    textMuted: "#7A7580",
    border: "#EAE4E8",
  },
};

/**
 * Get a color palette by ID
 */
export function getColorPalette(paletteId: string): ColorPalette {
  return COLOR_PALETTES[paletteId] || COLOR_PALETTES.classic;
}

/**
 * Convert hex color to RGB values for CSS variables
 * Format: "R G B" (space-separated, 0-255)
 */
function hexToRGB(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Generate CSS custom properties from a palette
 * Includes both wedding-specific and Tailwind theme overrides
 */
export function paletteToCSS(palette: ColorPalette): Record<string, string> {
  return {
    // Wedding-specific variables (hex format for direct use)
    "--wedding-primary": palette.primary,
    "--wedding-secondary": palette.secondary,
    "--wedding-background": palette.background,
    "--wedding-surface": palette.surface,
    "--wedding-text": palette.text,
    "--wedding-text-muted": palette.textMuted,
    "--wedding-border": palette.border,
    // Tailwind/global theme overrides (RGB format: "R G B")
    "--surface": hexToRGB(palette.surface),
    "--foreground": hexToRGB(palette.text),
    "--muted": hexToRGB(palette.textMuted),
    "--muted-foreground": hexToRGB(palette.textMuted),
    "--primary": hexToRGB(palette.primary),
    "--secondary": hexToRGB(palette.secondary),
    "--accent": hexToRGB(palette.primary),
    "--border": hexToRGB(palette.border),
    "--background": hexToRGB(palette.background),
    "--card": hexToRGB(palette.surface),
    "--card-foreground": hexToRGB(palette.text),
  };
}

/**
 * Available palette IDs for validation
 */
export const AVAILABLE_PALETTE_IDS = Object.keys(COLOR_PALETTES);
