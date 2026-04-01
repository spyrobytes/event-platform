"use client";

/**
 * Soft Masonry Gallery — The Garden House
 *
 * Masonry layout with rounded corners and organic feel.
 * Softer than the editorial grid — images have generous border-radius
 * and warm shadows. Like photos pinned to a garden wall.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";

export function SoftMasonry({
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
        title?: string;
        url: string;
      }>;
  }, [normalized.items, assets]);

  if (resolvedItems.length === 0) return null;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", textAlign: "center" }}
      aria-label="Gallery"
      id="gallery"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {normalized.heading || "Gallery"}
        </h2>

        {/* CSS columns masonry */}
        <div
          style={{
            columnCount: 3,
            columnGap: "clamp(12px, 2vw, 20px)",
          }}
        >
          {resolvedItems.map((item, i) => (
            <div
              key={item.assetId || i}
              style={{
                breakInside: "avoid",
                marginBottom: "clamp(12px, 2vw, 20px)",
                borderRadius: "var(--r-lg, 24px)",
                overflow: "hidden",
                boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              }}
            >
              <img
                src={item.url}
                alt={item.caption || item.title || ""}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #gallery [style*="column-count: 3"] {
            column-count: 2 !important;
          }
        }
        @media (max-width: 480px) {
          #gallery [style*="column-count: 3"] {
            column-count: 1 !important;
          }
        }
      `}</style>
    </section>
  );
}
