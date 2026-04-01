"use client";

/**
 * Framed Fine Art Gallery — The Fine Art Romance
 *
 * Images presented in decorative frames with mat-like borders,
 * as if hung in a gallery. Soft shadows, rounded corners, generous
 * spacing. Each image feels precious and intentional.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";

export function FramedFineArt({
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
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Gallery"
      id="gallery"
    >
      <div
        style={{
          width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Header */}
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--sm, 0.85rem)",
            fontStyle: "italic",
            color: "var(--accent, #7a8c72)",
            marginBottom: 8,
          }}
        >
          Gallery
        </p>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 64px)",
          }}
        >
          {normalized.heading || "Moments"}
        </h2>

        {/* Framed grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "clamp(24px, 3vw, 40px)",
          }}
        >
          {resolvedItems.map((item, i) => (
            <div
              key={item.assetId || i}
              style={{
                background: "var(--surface, #ffffff)",
                padding: "clamp(12px, 2vw, 20px)",
                border: "1px solid var(--border, #e8e1d6)",
                borderRadius: "var(--r, 16px)",
                boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  aspectRatio: i % 3 === 0 ? "4 / 5" : "3 / 4",
                  overflow: "hidden",
                  borderRadius: "calc(var(--r, 16px) - 4px)",
                }}
              >
                <img
                  src={item.url}
                  alt={item.caption || item.title || ""}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              {(item.caption || item.title) && (
                <p
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "var(--sm, 0.85rem)",
                    fontStyle: "italic",
                    color: "var(--text-3, #a69e93)",
                    marginTop: "clamp(8px, 1vw, 14px)",
                    lineHeight: 1.4,
                  }}
                >
                  {item.caption || item.title}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
