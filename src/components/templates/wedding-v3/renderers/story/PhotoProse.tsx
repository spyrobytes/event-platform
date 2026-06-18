"use client";

/**
 * Photo Prose Story — The Garden House
 *
 * Photo + prose reel — story content flows naturally with
 * images interspersed. When milestones exist, renders as
 * a photo-text alternating flow. Organic and experiential.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";

export function PhotoProse({
  data,
  assets,
}: SectionRendererProps<StorySection["data"]>) {
  const { heading, content, milestones, imageAssetId } = data;
  const mainImage = imageAssetId ? assets.find((a) => a.id === imageAssetId) : null;
  const hasMilestones = milestones && milestones.length > 0;

  return (
    <section
      style={{ padding: "var(--section-y, 96px) 0", textAlign: "center" }}
      aria-label="Our Story"
      id="story"
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
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {heading || "Our Story"}
        </h2>

        {hasMilestones ? (
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(32px, 4vw, 48px)",
            }}
          >
            {milestones.map((m, i) => {
              const img = m.imageAssetId ? assets.find((a) => a.id === m.imageAssetId) : null;
              return (
                <div key={i} style={{ textAlign: "left" }}>
                  {img?.publicUrl && (
                    <div
                      style={{
                        position: "relative",
                        aspectRatio: "16 / 10",
                        borderRadius: "var(--r-lg, 24px)",
                        overflow: "hidden",
                        marginBottom: "clamp(16px, 2vw, 24px)",
                      }}
                    >
                      <EventImage
                        src={img.publicUrl}
                        alt={m.title || ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 680px"
                        blurDataURL={img.blurDataUrl}
                        renditionWidths={img.renditionWidths}
                        style={{ objectFit: "cover", objectPosition: "center 25%" }}
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 8, flexWrap: "wrap" }}>
                    {m.year && (
                      <span
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "var(--sm, 0.85rem)",
                          fontWeight: 500,
                          color: "var(--accent, #7a8c72)",
                          background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        {m.year}
                      </span>
                    )}
                    {m.title && (
                      <h3
                        style={{
                          fontFamily: "var(--serif)",
                          fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
                          fontWeight: 400,
                          color: "var(--text, #3d3830)",
                          margin: 0,
                        }}
                      >
                        {m.title}
                      </h3>
                    )}
                  </div>
                  {m.description && (
                    <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body, 1rem)", lineHeight: 1.75, color: "var(--text-2, #786f65)" }}>
                      {m.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            {mainImage?.publicUrl && (
              <div
                style={{
                  position: "relative",
                  aspectRatio: "16 / 10",
                  borderRadius: "var(--r-lg, 24px)",
                  overflow: "hidden",
                  marginBottom: "clamp(24px, 3vw, 40px)",
                }}
              >
                <EventImage
                  src={mainImage.publicUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 620px"
                  blurDataURL={mainImage.blurDataUrl}
                  renditionWidths={mainImage.renditionWidths}
                  style={{ objectFit: "cover", objectPosition: "center 25%" }}
                />
              </div>
            )}
            <p
              style={{
                fontFamily: "var(--sans)",
                fontSize: "var(--body, 1rem)",
                lineHeight: 1.85,
                color: "var(--text-2, #786f65)",
                whiteSpace: "pre-line",
                textAlign: "left",
              }}
            >
              {content}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
