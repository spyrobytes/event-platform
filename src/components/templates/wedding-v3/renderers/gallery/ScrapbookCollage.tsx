"use client";

/**
 * Scrapbook Collage Gallery — The Celebration House
 *
 * Images at slight angles with rounded corners, like photos
 * scattered on a table or pinned to a scrapbook page.
 * Playful, festive, social.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";

// Slight rotation angles for scrapbook feel
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-1.5deg", "1deg", "-2.5deg", "0.5deg"];

export function ScrapbookCollage({
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
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {normalized.heading || "Memories"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "clamp(16px, 2.5vw, 28px)",
          }}
        >
          {resolvedItems.map((item, i) => (
            <div
              key={item.assetId || i}
              style={{
                transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})`,
                transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(0deg) scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${ROTATIONS[i % ROTATIONS.length]})`; }}
            >
              <div
                style={{
                  background: "var(--surface, #ffffff)",
                  padding: "clamp(8px, 1.5vw, 14px)",
                  paddingBottom: "clamp(28px, 4vw, 40px)",
                  borderRadius: "var(--r, 16px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderRadius: "calc(var(--r, 16px) - 4px)",
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.caption || item.title || ""}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                {(item.caption || item.title) && (
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: "var(--sm, 0.85rem)",
                      color: "var(--text-2, #786f65)",
                      marginTop: "clamp(8px, 1vw, 12px)",
                      textAlign: "center",
                    }}
                  >
                    {item.caption || item.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
