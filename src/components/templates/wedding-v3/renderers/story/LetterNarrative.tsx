"use client";

/**
 * Letter Narrative Story — The Intimate Note
 *
 * The story as a personal letter — centered prose in serif type,
 * like a handwritten note to guests. No timeline, no milestones grid.
 * Just flowing text that trusts the couple's words.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";

export function LetterNarrative({
  data,
}: SectionRendererProps<StorySection["data"]>) {
  const { heading, content } = data;

  return (
    <section
      style={{
        padding: "var(--section-y, 96px) 0",
        textAlign: "center",
      }}
      aria-label="Our Story"
      id="story"
    >
      <div
        style={{
          width: "min(var(--max, 800px), 100% - 2 * var(--pad, 40px))",
          margin: "0 auto",
          maxWidth: 580,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "var(--h2, clamp(1.8rem, 3.2vw, 2.8rem))",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--text, #3d3830)",
            marginBottom: "clamp(24px, 3vw, 40px)",
          }}
        >
          {heading || "Our Story"}
        </h2>

        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(1rem, 1.2vw, 1.1rem)",
            lineHeight: 1.9,
            color: "var(--text-2, #786f65)",
            fontWeight: 300,
            fontStyle: "italic",
            whiteSpace: "pre-line",
            textAlign: "left",
          }}
        >
          {content}
        </div>
      </div>
    </section>
  );
}
