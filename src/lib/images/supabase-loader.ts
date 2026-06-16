/**
 * Next.js image loader for Supabase Storage.
 *
 * Selects the nearest *stored* responsive rendition for the requested width — a
 * pure string swap, never an on-the-fly transform. We deliberately do NOT route
 * through Supabase's `/storage/v1/render/image/` endpoint:
 *  - Images are already optimized to WebP and sized by the sharp ingestion
 *    pipeline (media-validation.ts `optimizeImage` / `generateRenditions`), so
 *    transforms are redundant.
 *  - Supabase bills transformations per *origin image* (100/cycle on Pro); with
 *    a spend cap, exceeding the quota *disables* the render endpoint and breaks
 *    every image routed through it. Serving from `/storage/v1/object/public/...`
 *    is plain object-storage egress, not gated by the quota or spend cap.
 *
 * The selection itself lives in the client-safe `rendition` module. A `src`
 * carrying the `?rw=` marker (added by EventImage for assets that have stored
 * renditions) is mapped to the nearest rung; any `src` WITHOUT the marker —
 * un-backfilled assets, non-HERO assets, external images — is returned
 * unchanged (passthrough). So this is purely additive: nothing changes for
 * existing, undecorated images.
 */

import { resolveRenditionUrl } from "@/lib/images/rendition";

type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

export default function supabaseImageLoader({
  src,
  width,
}: ImageLoaderParams): string {
  return resolveRenditionUrl(src, width);
}
