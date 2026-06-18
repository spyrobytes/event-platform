"use client";

/**
 * Chapter Cards Story — The Fine Art Romance
 *
 * Story milestones presented as formal chapter cards — centered text
 * on a surface card with decorative rules. When no milestones, renders
 * as a centered prose block with an optional framed image above.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";

export function ChapterCards({
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
          Our Story
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
          {heading || "Our Story"}
        </h2>

        {hasMilestones ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(24px, 3vw, 40px)",
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            {milestones.map((m, i) => {
              const img = m.imageAssetId ? assets.find((a) => a.id === m.imageAssetId) : null;
              return (
                <div
                  key={i}
                  style={{
                    background: "var(--surface, #ffffff)",
                    border: "1px solid var(--border, #e8e1d6)",
                    borderRadius: "var(--r, 16px)",
                    padding: "clamp(28px, 4vw, 40px)",
                    textAlign: "center",
                  }}
                >
                  {img?.publicUrl && (
                    <div
                      style={{
                        position: "relative",
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        overflow: "hidden",
                        margin: "0 auto clamp(16px, 2vw, 24px)",
                        border: "2px solid var(--border, #e8e1d6)",
                      }}
                    >
                      <EventImage
                        src={img.publicUrl}
                        alt={m.title || ""}
                        fill
                        sizes="80px"
                        blurDataURL={img.blurDataUrl}
                        renditionWidths={img.renditionWidths}
                        style={{ objectFit: "cover", objectPosition: "center 25%" }}
                      />
                    </div>
                  )}
                  {m.year && (
                    <p
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: "var(--sm, 0.85rem)",
                        fontWeight: 500,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: "var(--accent, #7a8c72)",
                        marginBottom: 8,
                      }}
                    >
                      {m.year}
                    </p>
                  )}
                  {m.title && (
                    <h3
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: "var(--h3, clamp(1.15rem, 1.6vw, 1.35rem))",
                        fontWeight: 400,
                        color: "var(--text, #3d3830)",
                        margin: "0 0 8px",
                      }}
                    >
                      {m.title}
                    </h3>
                  )}
                  {m.description && (
                    <p
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: "var(--body, 1rem)",
                        lineHeight: 1.75,
                        color: "var(--text-2, #786f65)",
                        maxWidth: "44ch",
                        margin: "0 auto",
                      }}
                    >
                      {m.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            {mainImage?.publicUrl && (
              <div
                style={{
                  position: "relative",
                  aspectRatio: "4 / 3",
                  borderRadius: "var(--r, 16px)",
                  overflow: "hidden",
                  marginBottom: "clamp(24px, 3vw, 40px)",
                  border: "1px solid var(--border, #e8e1d6)",
                }}
              >
                <EventImage
                  src={mainImage.publicUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 580px"
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
