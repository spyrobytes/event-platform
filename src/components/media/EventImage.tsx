import Image, { type ImageProps } from "next/image";
import supabaseImageLoader from "@/lib/images/supabase-loader";
import { withRenditionWidths } from "@/lib/images/rendition";

/**
 * An event's cover responsive data, as selected by COVER_ASSET_SELECT
 * (src/lib/cover-media-asset.ts). Passed to EventImage via `renditionWidths`.
 * Shared so the card data types can't drift apart. See issue #211 (Tier 2).
 */
export type EventCoverAsset = { renditionWidths: number[] } | null;

type EventImageProps = Omit<ImageProps, "loader" | "placeholder" | "blurDataURL"> & {
  blurDataURL?: string | null;
  /**
   * Available responsive rendition widths for this asset
   * (`media_assets.renditionWidths`). When provided, the loader serves the
   * nearest stored rendition per device width; when absent/empty the original is
   * served (passthrough). Only applies to string `src` values.
   */
  renditionWidths?: readonly number[] | null;
};

/**
 * Image component for public event pages.
 *
 * Wraps next/image with the Supabase rendition loader (no on-the-fly transform —
 * see supabase-loader.ts). When `renditionWidths` is supplied, the `src` is
 * decorated so the loader can select the nearest stored rendition for each
 * device width; otherwise the original object is served as-is. Supports blur
 * placeholders when available.
 *
 * Usage:
 *   <EventImage src={asset.publicUrl} alt="..." fill sizes="100vw" priority />
 *   <EventImage src={asset.publicUrl} alt="..." fill sizes="..." renditionWidths={asset.renditionWidths} />
 */
export function EventImage({
  blurDataURL,
  renditionWidths,
  src,
  ...props
}: EventImageProps) {
  const decoratedSrc =
    typeof src === "string" && renditionWidths && renditionWidths.length > 0
      ? withRenditionWidths(src, renditionWidths)
      : src;

  return (
    <Image
      loader={supabaseImageLoader}
      src={decoratedSrc}
      {...(blurDataURL
        ? { placeholder: "blur" as const, blurDataURL }
        : {})}
      {...props}
    />
  );
}
