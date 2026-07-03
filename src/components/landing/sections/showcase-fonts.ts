import { Cormorant_Garamond } from "next/font/google";

/**
 * Display serif for the TemplateShowcase section — the same face the wedding
 * templates ship with (see wedding-v2 FONT_PAIRS), so the marketing moment
 * speaks the product's own type voice.
 */
export const showcaseSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-showcase-serif",
});
