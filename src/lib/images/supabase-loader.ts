/**
 * Custom Next.js image loader for Supabase Storage transforms.
 *
 * Converts public object URLs to the Supabase image render endpoint,
 * which resizes on-the-fly and caches at the edge. This avoids routing
 * all image optimization through Vercel's pipeline.
 *
 * Expects `src` to be a full Supabase public URL, e.g.:
 *   https://xxx.supabase.co/storage/v1/object/public/event-assets/...
 *
 * In development, returns the src unchanged since local Supabase
 * may not support the image transform endpoint.
 */

type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: ImageLoaderParams): string {
  // In dev, skip transforms — local Supabase may not support them
  if (process.env.NODE_ENV === "development") {
    return src;
  }

  const q = quality ?? 75;

  // Convert object URL to render/image URL for on-the-fly transforms
  if (src.includes("/storage/v1/object/public/")) {
    const transformUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    return `${transformUrl}?width=${width}&quality=${q}&resize=contain`;
  }

  // Fallback: return src as-is if it doesn't match the expected pattern
  return src;
}
