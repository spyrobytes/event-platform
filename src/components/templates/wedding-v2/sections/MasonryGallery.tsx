"use client";

import { SectionWrapper, SectionTitle } from "../../shared";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { GallerySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./MasonryGallery.module.css";

type MasonryGalleryProps = {
  data: GallerySection["data"];
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Masonry Gallery - V2 asymmetric masonry layout
 *
 * Uses CSS columns for a natural masonry flow.
 * Images have subtle hover tilt effect via CSS.
 */
export function MasonryGallery({ data, assets, primaryColor }: MasonryGalleryProps) {
  const { heading, items, showCaptions } = normalizeGalleryData(data);

  // Resolve asset URLs
  const resolvedItems = items
    .map((item) => {
      const asset = assets.find((a) => a.id === item.assetId);
      if (!asset?.publicUrl) return null;
      return {
        ...item,
        url: asset.publicUrl,
        alt: asset.alt || item.caption || item.title || "Gallery image",
        width: asset.width,
        height: asset.height,
      };
    })
    .filter(Boolean) as Array<{
      assetId: string;
      caption?: string;
      title?: string;
      moment?: string;
      url: string;
      alt: string;
      width: number | null;
      height: number | null;
    }>;

  if (resolvedItems.length === 0) {
    return (
      <SectionWrapper ariaLabel="Gallery">
        <div className="mx-auto max-w-5xl">
          <SectionTitle>
            <span style={{ color: primaryColor }}>{heading}</span>
          </SectionTitle>
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <p className="text-muted-foreground">Gallery images coming soon</p>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper ariaLabel="Gallery">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>
          <span style={{ color: primaryColor }}>{heading}</span>
        </SectionTitle>

        <div className={styles.masonry}>
          {resolvedItems.map((item, index) => (
            <div key={item.assetId} className={styles.item}>
              <div className={styles.imageWrap}>
                <img
                  src={item.url}
                  alt={item.alt}
                  className={styles.image}
                  loading={index > 3 ? "lazy" : undefined}
                />
                {/* Overlay on hover */}
                {showCaptions && (item.caption || item.title) && (
                  <div className={styles.overlay}>
                    {item.title && (
                      <p className={styles.imageTitle}>{item.title}</p>
                    )}
                    {item.caption && (
                      <p className={styles.caption}>{item.caption}</p>
                    )}
                    {item.moment && (
                      <p
                        className={styles.moment}
                        style={{ color: primaryColor }}
                      >
                        {item.moment}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
