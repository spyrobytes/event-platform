/**
 * Wedding V2 Design Tokens
 *
 * V2-specific color palette, typography scale, spacing.
 * The default palette is ivory/cream/sage/gold/forest from the cinematic POC.
 * Respects user's theme.primaryColor override.
 */

export const WEDDING_V2_PALETTE = {
  ivory: "#FFFDF7",
  cream: "#F5F0E8",
  sage: "#7D8471",
  gold: "#C9A962",
  forest: "#2D4A3E",
  text: "#2D2D2D",
  textMuted: "#6B6B6B",
  border: "#E2DED8",
} as const;

/**
 * Default V2 CSS variables
 * These are applied when the user hasn't customized the theme.
 */
export function getV2CSSVariables(primaryColor?: string): Record<string, string> {
  const accent = primaryColor || WEDDING_V2_PALETTE.sage;

  return {
    "--wedding-primary": accent,
    "--wedding-secondary": WEDDING_V2_PALETTE.gold,
    "--wedding-background": WEDDING_V2_PALETTE.ivory,
    "--wedding-surface": "#FFFFFF",
    "--wedding-text": WEDDING_V2_PALETTE.text,
    "--wedding-text-muted": WEDDING_V2_PALETTE.textMuted,
    "--wedding-border": WEDDING_V2_PALETTE.border,
    "--wedding-font-heading": "'Cormorant Garamond', Georgia, serif",
    "--wedding-font-body": "'DM Sans', system-ui, sans-serif",
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
