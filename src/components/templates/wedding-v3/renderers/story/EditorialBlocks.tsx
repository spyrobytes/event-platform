"use client";

/**
 * Editorial Blocks Story — The Editorial
 *
 * Alternating text/image blocks in a clean grid layout.
 * When milestones are present, each milestone becomes an editorial block
 * with image and text side-by-side, alternating direction.
 * When only prose is present, renders as a two-column layout
 * with sticky image alongside flowing text.
 */

import type { SectionRendererProps } from "../../types";
import type { StorySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./EditorialBlocks.module.css";

export function EditorialBlocks({
  data,
  assets,
}: SectionRendererProps<StorySection["data"]>) {
  const { heading, content, milestones, imageAssetId } = data;

  const mainImage = imageAssetId
    ? assets.find((a) => a.id === imageAssetId)
    : null;

  const hasMilestones = milestones && milestones.length > 0;

  return (
    <section className={styles.section} aria-label="Our Story" id="story">
      <div className={styles.container}>
        {/* Header — left-aligned, editorial */}
        <div className={styles.header}>
          <p className={styles.kicker}>Our Story</p>
          <h2 className={styles.heading}>{heading || "Our Story"}</h2>
        </div>

        {hasMilestones ? (
          /* Milestone blocks — alternating layout */
          milestones.map((milestone, i) => {
            const milestoneImage = milestone.imageAssetId
              ? assets.find((a) => a.id === milestone.imageAssetId)
              : null;

            return (
              <div key={i} className={styles.block}>
                {/* Image */}
                <div className={styles.blockImage}>
                  {milestoneImage?.publicUrl ? (
                    <img
                      src={milestoneImage.publicUrl}
                      alt={milestone.title || ""}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: `linear-gradient(135deg, var(--cream) 0%, var(--linen) 100%)`,
                      }}
                    />
                  )}
                </div>

                {/* Text */}
                <div className={styles.blockText}>
                  {milestone.year && (
                    <span className={styles.milestoneDate}>
                      {milestone.year}
                    </span>
                  )}
                  {milestone.title && (
                    <h3 className={styles.milestoneTitle}>
                      {milestone.title}
                    </h3>
                  )}
                  {milestone.description && (
                    <p className={styles.milestoneDesc}>
                      {milestone.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Single prose block with side image */
          <div className={styles.singleBlock}>
            {mainImage?.publicUrl && (
              <div className={styles.singleImage}>
                <img
                  src={mainImage.publicUrl}
                  alt=""
                  loading="lazy"
                />
              </div>
            )}
            <div className={styles.prose}>{content}</div>
          </div>
        )}
      </div>
    </section>
  );
}
