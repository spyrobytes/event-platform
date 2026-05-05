import type { V2FontPair, V2PaletteOverrides, V2GlassTokens } from "../tokens";
export type { V2PaletteOverrides, V2GlassTokens };

export type V2VariantId =
  | "midnight_gold"
  | "emerald_ivory"
  | "plum_blush"
  | "scrapbook_edition"
  | "scrapbook_midnight"
  | "scrapbook_emerald"
  | "scrapbook_plum"
  // Legacy IDs — kept for backward compatibility with existing events
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
  | "citrus_grove";

export type V2GalleryRendererOverride = "default" | "scrapbook";
export type V2WeddingPartyRendererOverride = "default" | "scrapbook";

export type V2VariantFamily = "original" | "scrapbook";

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
  /** Override gallery section renderer (default: V2 MasonryGallery) */
  galleryRenderer?: V2GalleryRendererOverride;
  /** Override wedding party section renderer (default: V2 WeddingPartyV2) */
  weddingPartyRenderer?: V2WeddingPartyRendererOverride;
  /** Picker family — groups derivative skins under their structural base */
  family?: V2VariantFamily;
  /** Optional guidance shown next to the hero image picker for this variant */
  heroImageTip?: string;
};
