/**
 * Fallback intrinsic dimensions for next/image when a MediaAsset's
 * width/height columns are null (older uploads predating those columns,
 * or assets where extraction failed). next/image needs both dimensions
 * for srcset generation when not using `fill`; the chosen values cover
 * the common case of a ~4:3 photo at desktop-lightbox scale.
 */
export const DEFAULT_LIGHTBOX_FALLBACK_WIDTH = 1600;
export const DEFAULT_LIGHTBOX_FALLBACK_HEIGHT = 1200;
