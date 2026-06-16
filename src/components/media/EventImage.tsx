import Image, { type ImageProps } from "next/image";
import supabaseImageLoader from "@/lib/images/supabase-loader";

type EventImageProps = Omit<ImageProps, "loader" | "placeholder" | "blurDataURL"> & {
  blurDataURL?: string | null;
};

/**
 * Image component for public event pages.
 *
 * Wraps next/image with the passthrough Supabase loader, serving the
 * already-sharp-optimized stored object directly (no on-the-fly transform —
 * see supabase-loader.ts for why). Supports blur placeholders when available.
 * Responsive per-device renditions are a planned follow-up (ingestion-time
 * sizes + nearest-rendition selection), not provided today.
 *
 * Usage:
 *   <EventImage src={asset.publicUrl} alt="..." fill sizes="100vw" priority />
 *   <EventImage src={asset.publicUrl} alt="..." fill sizes="..." blurDataURL={asset.blurDataUrl} />
 */
export function EventImage({ blurDataURL, ...props }: EventImageProps) {
  return (
    <Image
      loader={supabaseImageLoader}
      {...(blurDataURL
        ? { placeholder: "blur" as const, blurDataURL }
        : {})}
      {...props}
    />
  );
}
