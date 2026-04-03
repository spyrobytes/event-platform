"use client";

/**
 * Letter Narrative Story — The Intimate Note
 *
 * The story as a personal letter — centered prose in serif italic,
 * like a handwritten note to guests. A decorative opening mark
 * anchors the text. Paragraphs split on double newlines for
 * proper structure.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";
import styles from "./LetterNarrative.module.css";

export function LetterNarrative({
  data,
}: SectionRendererProps<StorySection["data"]>) {
  const { heading, content } = data;

  // Split content into paragraphs on double newlines
  const paragraphs = useMemo(() => {
    if (!content) return [];
    return content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [content]);

  if (!content && paragraphs.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Our Story" id="story">
      <div className={styles.container}>
        <h2 className={styles.heading}>
          {heading || "Our Story"}
        </h2>

        {/* Decorative opening mark */}
        <div className={styles.openingMark} aria-hidden="true">&ldquo;</div>

        <div className={styles.prose}>
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} className={styles.paragraph}>{p}</p>
            ))
          ) : (
            <p className={styles.paragraph}>{content}</p>
          )}
        </div>
      </div>
    </section>
  );
}
