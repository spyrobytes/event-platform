"use client";

/**
 * Quote-Led Story — The Grand Luxe
 *
 * Story presented through dramatic quote-style blocks.
 * Large serif quotes with accent-colored quotation marks.
 * Bold, editorial, premium.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";

export function QuoteLed({
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
        <p style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--accent, #c5a55a)", marginBottom: 8 }}>
          Our Story
        </p>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: "var(--h2)", fontWeight: 400, color: "var(--text)", marginBottom: "clamp(48px, 6vw, 72px)" }}>
          {heading || "Our Story"}
        </h2>

        {hasMilestones ? (
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: "clamp(48px, 6vw, 72px)" }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                {/* Large decorative quote mark */}
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "clamp(3rem, 5vw, 5rem)",
                    lineHeight: 1,
                    color: "var(--accent, #c5a55a)",
                    opacity: 0.3,
                    marginBottom: -16,
                  }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>
                {m.description && (
                  <blockquote
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)",
                      fontWeight: 300,
                      fontStyle: "italic",
                      lineHeight: 1.7,
                      color: "var(--text, #3d3830)",
                      maxWidth: "48ch",
                      margin: "0 auto clamp(16px, 2vw, 24px)",
                    }}
                  >
                    {m.description}
                  </blockquote>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  {m.year && (
                    <span style={{ fontFamily: "var(--sans)", fontSize: "var(--sm)", fontWeight: 600, letterSpacing: "0.1em", color: "var(--accent, #c5a55a)" }}>
                      {m.year}
                    </span>
                  )}
                  {m.year && m.title && (
                    <span style={{ width: 1, height: 14, background: "var(--border, #e8e1d6)" }} aria-hidden="true" />
                  )}
                  {m.title && (
                    <span style={{ fontFamily: "var(--serif)", fontSize: "1rem", fontWeight: 400, color: "var(--text-2)" }}>
                      {m.title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {mainImage?.publicUrl && (
              <div style={{ aspectRatio: "16 / 9", borderRadius: 2, overflow: "hidden", marginBottom: "clamp(32px, 4vw, 48px)" }}>
                <img src={mainImage.publicUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
