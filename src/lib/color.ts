/**
 * WCAG relative-luminance / contrast helpers.
 *
 * Pure color math with zero dependencies, so client components can import it
 * without pulling a heavier module (e.g. the zod schema module that used to
 * host these) into their bundle.
 */

/** Matches a 6-digit hex color, e.g. "#34005B". */
export const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/** WCAG relative luminance (0–1) of a 6-digit hex color. */
export function getRelativeLuminance(hex: string): number {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((c) => {
      const val = parseInt(c, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** WCAG contrast ratio (1–21) between two 6-digit hex colors. */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True if `color` clears WCAG AA (4.5:1) for normal text against white. */
export function isAccessibleColor(color: string): boolean {
  try {
    return getContrastRatio(color, "#FFFFFF") >= 4.5;
  } catch {
    return false;
  }
}
