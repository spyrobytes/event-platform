import Image, { type ImageProps } from "next/image";
import supabaseImageLoader from "@/lib/images/supabase-loader";

type EventImageProps = Omit<ImageProps, "loader" | "placeholder" | "blurDataURL"> & {
  blurDataURL?: string | null;
};

/**
 * Optimized image component for public event pages.
 *
 * Wraps next/image with the Supabase transform loader for responsive,
 * edge-cached image delivery. Supports blur placeholders when available.
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
