"use client";

import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { GalleryLayoutProps } from "./types";

/**
 * Classic Grid — the default, utilitarian variant.
 *
 * Uniform square thumbnails on a responsive 2/3/4-column grid. This is
 * the exact markup that shipped in PR A; extracted here so the renderer
 * can dispatch between variants without changing the established
 * default rendering. Safe fallback for any future variant the schema
 * doesn't recognize.
 */
export function ClassicGridLayout({ items, onOpenLightbox }: GalleryLayoutProps) {
  return (
    <ul
      className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4"
      role="list"
    >
      {items.map((item, idx) => (
        <li key={item.id} className="overflow-hidden rounded-md bg-muted">
          <button
            type="button"
            onClick={() => onOpenLightbox(idx)}
            className="relative block aspect-square w-full overflow-hidden transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            aria-label={item.alt || `Open photo ${idx + 1}`}
          >
            <Image
              src={item.thumbnailSrc}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              placeholder={item.blurDataUrl ? "blur" : "empty"}
              blurDataURL={item.blurDataUrl ?? undefined}
              unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
