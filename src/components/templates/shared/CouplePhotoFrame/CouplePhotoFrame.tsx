"use client";

/**
 * CouplePhotoFrame — shared frame-shape primitive for hero couple photos.
 *
 * Owns ONLY the shape geometry (heart clip, circle, full-length aspect) and
 * the per-frame focal-point default. Everything template-specific — size,
 * position, rings/borders, shadows, entrance animation, image filters — stays
 * in the host hero's CSS via `className`. The image element itself is passed
 * as children so hosts keep their own pipeline (EventImage vs plain <img>).
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CouplePhotoFrameId } from "./frame-options";
import styles from "./CouplePhotoFrame.module.css";

/**
 * Shallow-notch heart (objectBoundingBox units, 0..1 — scales to any box):
 * valley at y=0.12 instead of a deep 0.20 V so the top of a head-and-shoulders
 * portrait isn't clipped between the two lobes.
 */
const HEART_CLIP_PATH =
  "M0.5,0.88 C0.3,0.72 0.04,0.56 0.04,0.32 C0.04,0.14 0.18,0.04 0.32,0.04 C0.42,0.04 0.48,0.08 0.5,0.12 C0.52,0.08 0.58,0.04 0.68,0.04 C0.82,0.04 0.96,0.14 0.96,0.32 C0.96,0.56 0.7,0.72 0.5,0.88 Z";

/** Where the photo's focal point lands per frame, overridable per host.
 * heart/circle assume head-and-shoulders portraits; "center 25%" puts the
 * face in the widest band of the shape. full anchors top so heads never crop. */
const DEFAULT_OBJECT_POSITION: Record<CouplePhotoFrameId, string> = {
  heart: "center 25%",
  circle: "center",
  full: "center top",
};

type CouplePhotoFrameProps = {
  frame: CouplePhotoFrameId;
  /** Host class — size, position, decoration, animation. */
  className?: string;
  /** Override the per-frame focal-point default (CSS object-position). */
  objectPosition?: string;
  /** The image element (EventImage or <img>). */
  children: ReactNode;
};

export function CouplePhotoFrame({
  frame,
  className,
  objectPosition,
  children,
}: CouplePhotoFrameProps) {
  // Per-instance clip id so editor preview + published page (or multiple
  // framed photos) can coexist in one document. useId's delimiters are
  // invalid inside url(#...), so strip to a safe charset.
  const clipId = `cpf-heart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const style: CSSProperties = {
    "--cpf-object-position": objectPosition ?? DEFAULT_OBJECT_POSITION[frame],
  } as CSSProperties;
  if (frame === "heart") {
    style.clipPath = `url(#${clipId})`;
    style.WebkitClipPath = `url(#${clipId})`;
  }

  return (
    <div
      className={cn(
        styles.frame,
        frame === "circle" && styles.circle,
        frame === "full" && styles.full,
        className,
      )}
      style={style}
    >
      {frame === "heart" && (
        <svg
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
          className={styles.clipDefs}
        >
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={HEART_CLIP_PATH} />
            </clipPath>
          </defs>
        </svg>
      )}
      {children}
    </div>
  );
}
