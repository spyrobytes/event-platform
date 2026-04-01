"use client";

/**
 * Cinematic Slider Gallery — The Grand Luxe
 *
 * Full-width images in a horizontal scroll strip with cinematic
 * aspect ratio (21:9). Dark gutters, dramatic presentation.
 * Like viewing film stills from a feature.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";

export function CinematicSlider({
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
      .filter(Boolean) as Array<{ assetId: string; caption?: string; title?: string; url: string }>;
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
          marginBottom: "clamp(32px, 4vw, 48px)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--sans)",
            fontSize: "var(--sm, 0.85rem)",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            color: "var(--accent, #c5a55a)",
            marginBottom: 8,
          }}
        >
          Gallery
        </p>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 400,
            color: "var(--text, #3d3830)",
          }}
        >
          {normalized.heading || "Moments"}
        </h2>
      </div>

      {/* Full-width horizontal scroll strip */}
      <div
        style={{
          display: "flex",
          gap: 3,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          padding: "0 clamp(16px, 3vw, 32px)",
        }}
      >
        {resolvedItems.map((item, i) => (
          <div
            key={item.assetId || i}
            style={{
              flexShrink: 0,
              width: "clamp(300px, 60vw, 700px)",
              aspectRatio: "16 / 9",
              scrollSnapAlign: "center",
              overflow: "hidden",
              borderRadius: 2,
              position: "relative",
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
            {(item.caption || item.title) && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "32px 20px 16px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                  fontFamily: "var(--sans)",
                  fontSize: "var(--sm, 0.85rem)",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {item.caption || item.title}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style>{`
        #gallery div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
