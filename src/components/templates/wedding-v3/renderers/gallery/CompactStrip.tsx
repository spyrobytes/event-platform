"use client";

/**
 * Compact Strip Gallery — The Intimate Note
 *
 * A single-row horizontal strip of images. Minimal, restrained,
 * trusts the photography to speak for itself. No grid complexity,
 * no overlay captions — just a quiet row of memories.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";

export function CompactStrip({
  data,
  assets,
}: SectionRendererProps<GallerySection["data"]>) {
  const normalized = useMemo(() => normalizeGalleryData(data), [data]);

  const resolvedItems = useMemo(() => {
    return normalized.items
      .map((item) => {
        const asset = assets.find((a) => a.id === item.assetId);
        if (!asset?.publicUrl) return null;
        return { ...item, url: asset.publicUrl };
      })
      .filter(Boolean) as Array<{
        assetId: string;
        caption?: string;
        url: string;
      }>;
  }, [normalized.items, assets]);

  if (resolvedItems.length === 0) return null;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Gallery"
      id="gallery"
    >
      <div
        style={{
          width: "min(var(--max, 800px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        {/* Heading */}
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            textAlign: "center",
            marginBottom: "clamp(32px, 4vw, 48px)",
          }}
        >
          {normalized.heading || "Gallery"}
        </h2>

        {/* Single-row strip */}
        <div
          style={{
            display: "flex",
            gap: 4,
            overflow: "hidden",
          }}
        >
          {resolvedItems.slice(0, 5).map((item, i) => (
            <div
              key={item.assetId || i}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                aspectRatio: "3 / 4",
                overflow: "hidden",
              }}
            >
              <img
                src={item.url}
                alt={item.caption || ""}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
