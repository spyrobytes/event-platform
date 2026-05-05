"use client";

/**
 * Milestone Mosaic Story — The Celebration House
 *
 * Milestones as a mosaic/scrapbook-style layout. More visual density
 * and energy than other story renderers. Each milestone is a card
 * in a grid with rounded corners and playful spacing.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";

export function MilestoneMosaic({
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
            fontSize: "var(--h2)",
            fontWeight: 500,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(40px, 5vw, 56px)",
          }}
        >
          {heading || "Our Story"}
        </h2>

        {hasMilestones ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "clamp(16px, 2vw, 24px)",
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
                    overflow: "hidden",
                    textAlign: "left",
                  }}
                >
                  {img?.publicUrl && (
                    <div style={{ aspectRatio: "16 / 10", overflow: "hidden" }}>
                      <img
                        src={img.publicUrl}
                        alt={m.title || ""}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%", display: "block" }}
                      />
                    </div>
                  )}
                  <div style={{ padding: "clamp(16px, 2vw, 24px)" }}>
                    {m.year && (
                      <span
                        style={{
                          display: "inline-block",
                          fontFamily: "var(--sans)",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          color: "var(--accent, #7a8c72)",
                          background: "color-mix(in srgb, var(--accent, #7a8c72) 10%, transparent)",
                          padding: "3px 10px",
                          borderRadius: 999,
                          marginBottom: 8,
                        }}
                      >
                        {m.year}
                      </span>
                    )}
                    {m.title && (
                      <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", fontWeight: 500, color: "var(--text)", margin: "0 0 6px" }}>
                        {m.title}
                      </h3>
                    )}
                    {m.description && (
                      <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            {mainImage?.publicUrl && (
              <div style={{ aspectRatio: "16 / 10", borderRadius: "var(--r, 16px)", overflow: "hidden", marginBottom: "clamp(24px, 3vw, 40px)" }}>
                <img src={mainImage.publicUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%", display: "block" }} />
              </div>
            )}
            <p style={{ fontFamily: "var(--sans)", fontSize: "var(--body)", lineHeight: 1.85, color: "var(--text-2)", whiteSpace: "pre-line", textAlign: "left" }}>
              {content}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
