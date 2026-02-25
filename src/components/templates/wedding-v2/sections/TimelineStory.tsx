"use client";

import { useRef } from "react";
import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";
import type { Milestone } from "@/schemas/event-page";
import styles from "./TimelineStory.module.css";

type TimelineStoryProps = {
  data: {
    heading?: string;
    content: string;
    layout?: "full" | "split" | "timeline";
    imageAssetId?: string;
    milestones?: Milestone[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Timeline Story Section - V2 scroll-drawn SVG timeline with milestone markers
 *
 * When layout is "timeline", renders milestones along a vertical SVG path.
 * Falls back to a prose-style display when no milestones are provided.
 */
export function TimelineStory({ data, assets, primaryColor }: TimelineStoryProps) {
  const {
    heading = "Our Story",
    content,
    milestones = [],
  } = data;
  const timelineRef = useRef<HTMLDivElement>(null);

  // Get asset URL helper
  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  const hasMilestones = milestones.length > 0;

  return (
    <SectionWrapper ariaLabel="Our story timeline">
      <div className="mx-auto max-w-4xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        {/* Story intro text */}
        <div className="prose prose-lg mx-auto mb-12 text-center">
          <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
            {content}
          </p>
        </div>

        {/* Timeline */}
        {hasMilestones && (
          <div ref={timelineRef} className={styles.timeline}>
            {/* Central vertical line */}
            <div
              className={styles.line}
              style={{ backgroundColor: `${primaryColor}30` }}
              aria-hidden="true"
            />

            {milestones.map((milestone, index) => {
              const isLeft = index % 2 === 0;
              const imageUrl = getAssetUrl(milestone.imageAssetId);

              return (
                <div
                  key={index}
                  className={`${styles.milestone} ${isLeft ? styles.left : styles.right}`}
                >
                  {/* Dot on the line */}
                  <div
                    className={styles.dot}
                    style={{ backgroundColor: primaryColor }}
                    aria-hidden="true"
                  />

                  {/* Card */}
                  <div className={styles.card}>
                    {imageUrl && (
                      <div className={styles.cardImage}>
                        <img
                          src={imageUrl}
                          alt={milestone.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className={styles.cardContent}>
                      <span
                        className={styles.year}
                        style={{ color: primaryColor }}
                      >
                        {milestone.year}
                      </span>
                      <h3 className={styles.milestoneTitle}>
                        {milestone.title}
                      </h3>
                      <p className={styles.milestoneDesc}>
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Decorative divider */}
        <div className="mt-12 flex items-center justify-center">
          <div
            className="h-px w-16"
            style={{ backgroundColor: `${primaryColor}40` }}
          />
          <svg
            className="mx-4 h-4 w-4"
            style={{ color: primaryColor }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <div
            className="h-px w-16"
            style={{ backgroundColor: `${primaryColor}40` }}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
