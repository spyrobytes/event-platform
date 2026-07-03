import { Cormorant_Garamond } from "next/font/google";

/**
 * Display serif for the TemplateShowcase section — the same face the wedding
 * templates ship with (see wedding-v2 FONT_PAIRS), so the marketing moment
 * speaks the product's own type voice.
 *
 * Trimmed to the weights the section actually sets (500/600; italics are
 * pinned to 500 in the CSS module) and NOT preloaded: the section is below
 * the fold, so with `display: swap` a late fetch is invisible, and skipping
 * the head preloads keeps the woff2 files from competing with the hero image
 * for LCP bandwidth.
 */
export const showcaseSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-showcase-serif",
});
