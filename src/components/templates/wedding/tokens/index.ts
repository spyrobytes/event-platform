/**
 * Wedding Template Design Tokens
 *
 * Centralized exports for colors, typography, and styling utilities.
 */

export * from "./colors";
export * from "./typography";

import { getColorPalette, paletteToCSS, type ColorPalette } from "./colors";
import {
  getFontPairing,
  fontPairingToCSS,
  type FontPairing,
} from "./typography";
import type { StyleTokens } from "../variants/types";

/**
 * Combined style context for a variant
 */
export type ResolvedStyles = {
  colors: ColorPalette;
  fonts: FontPairing;
  cssVariables: Record<string, string>;
};

/**
 * Resolve style tokens to actual values
 */
export function resolveStyles(tokens: StyleTokens): ResolvedStyles {
  const colors = getColorPalette(tokens.colorPalette);
  const fonts = getFontPairing(tokens.fontHeading);

  return {
    colors,
    fonts,
    cssVariables: {
      ...paletteToCSS(colors),
      ...fontPairingToCSS(fonts),
      "--wedding-accent": tokens.accentColor,
    },
  };
}

/**
 * Generate inline style object from CSS variables
 */
export function stylesToInline(
  cssVariables: Record<string, string>
): React.CSSProperties {
  return cssVariables as React.CSSProperties;
}
