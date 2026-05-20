/**
 * Shared shape for gallery items after asset resolution.
 *
 * Each V3 gallery renderer (CinematicSlider, CompactStrip, FramedFineArt,
 * ScrapbookCollage, SoftMasonry) builds an array of these in a useMemo
 * by joining the gallery's items array against the MediaAsset list.
 */
export type ResolvedGalleryItem = {
  assetId: string;
  caption?: string;
  title?: string;
  url: string;
  blurDataUrl?: string | null;
  width: number | null;
  height: number | null;
};
