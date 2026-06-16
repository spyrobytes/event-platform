/**
 * Next.js image loader for Supabase Storage — PASSTHROUGH.
 *
 * Returns the stored object URL unchanged. We deliberately do NOT rewrite to
 * Supabase's `/storage/v1/render/image/` transform endpoint.
 *
 * Why:
 *  - Images are already optimized to WebP and sized by the sharp ingestion
 *    pipeline (see media-validation.ts `optimizeImage` and gallery-worker.ts),
 *    so on-the-fly transforms are redundant — we'd pay to re-transform images
 *    we already processed.
 *  - Supabase bills image transformations per *origin image* (100/cycle on Pro).
 *    With a spend cap enabled, exceeding that quota *disables* the render
 *    endpoint for the rest of the cycle, which breaks every image routed
 *    through it. Serving straight from `/storage/v1/object/public/...` is plain
 *    object-storage egress — not gated by the transformation quota or spend cap.
 *
 * This loader is the single chokepoint for next/image optimization, so keeping
 * it a passthrough cannot be bypassed by per-component `unoptimized={false}`
 * props (which opt Supabase images back into the loader).
 *
 * Follow-up (Tier 2): upgrade this to select the nearest *stored* rendition by
 * width — a pure string swap against ingestion-generated sizes, still with no
 * transform call — to restore responsive images without consuming quota.
 */

type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

export default function supabaseImageLoader({ src }: ImageLoaderParams): string {
  // Serve the already-optimized stored object directly. No render endpoint.
  return src;
}
