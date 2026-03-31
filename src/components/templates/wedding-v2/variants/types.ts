import type { V2FontPair, V2PaletteOverrides, V2GlassTokens } from "../tokens";
export type { V2PaletteOverrides, V2GlassTokens };

export type V2VariantId =
  | "garden_romance"
  | "black_tie"
  | "old_world"
  | "modern_editorial"
  | "mono"
  | "soft_modern"
  | "blush_and_bloom"
  | "lavender_mist"
  | "desert_sun"
  | "forest_floor"
  | "midnight_gold"
  | "citrus_grove";

export type V2VariantCategory = "classic" | "modern" | "romantic" | "earthy" | "bold";

export type V2BotanicalVariant = "sage" | "gold" | "rose" | "none";

export type V2CuratedSwatch = {
  hex: string;
  label: string;
};

export type V2VariantConfig = {
  id: V2VariantId;
  displayName: string;
  description: string;
  category: V2VariantCategory;
  bestFor: string[];
  fontPair: V2FontPair;
  palette: V2PaletteOverrides;
  glass: V2GlassTokens;
  chromeDefaults: {
    topbar: boolean;
    scrollProgress: boolean;
    mountainDividers: boolean;
    footerSkyline: boolean;
    botanicals: boolean;
    botanicalVariant: V2BotanicalVariant;
  };
  accentSwatches: V2CuratedSwatch[];
  scrollProgressGradient?: string;
  thumbnail?: string;
};
