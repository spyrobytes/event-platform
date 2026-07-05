import type { MediaAsset } from "@prisma/client";

/**
 * Build a MediaAsset-shaped object for a static /public sample image, for
 * routes that render templates without a database (/test/template-preview,
 * /sample-templates). The cast is confined here.
 *
 * `width`/`height` matter to fill-mode hosts that derive intrinsic aspect
 * ratios; `renditionWidths: []` keeps buildRenditionSrcSet on its
 * no-renditions path, so the local src ships unchanged through the
 * marker-gated image loader.
 */
export function makeSampleAsset(asset: {
  id: string;
  publicUrl: string;
  alt?: string;
  tags?: string[];
  width?: number;
  height?: number;
}): MediaAsset {
  return {
    alt: "",
    tags: [],
    blurDataUrl: null,
    renditionWidths: [],
    ...asset,
  } as unknown as MediaAsset;
}
