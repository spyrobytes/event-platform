"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Chapter } from "./chapters";
import styles from "./ChapterBreak.module.css";

type ChapterBreakProps = {
  /** Chapter information */
  chapter: Chapter;
  /** Chapter number (1-indexed) */
  chapterNumber?: number;
  /** Total number of chapters */
  totalChapters?: number;
  /** Whether to show chapter number */
  showNumber?: boolean;
  /** Whether to show subtitle */
  showSubtitle?: boolean;
  /** Accent color for decorative elements */
  accentColor?: string;
  /** Additional CSS classes */
  className?: string;
  /** Visual style override */
  style?: "minimal" | "decorative" | "dramatic";
};

/**
 * ChapterBreak - Visual separator between content chapters
 *
 * Provides a subtle visual break between logical content groupings,
 * creating a "multi-page" feel without actual navigation.
 *
 * Follows the editorial-first philosophy with crafted defaults.
 *
 * @example
 * ```tsx
 * <ChapterBreak
 *   chapter={{ id: "our-story", name: "Our Story", subtitle: "How we met" }}
 *   chapterNumber={2}
 *   accentColor="#B76E79"
 * />
 * ```
 */
export function ChapterBreak({
  chapter,
  chapterNumber,
  totalChapters,
  showNumber = false,
  showSubtitle = true,
  accentColor,
  className,
  style: styleOverride,
}: ChapterBreakProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fade in when scrolled into view
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const visualStyle = styleOverride || chapter.style || "minimal";

  const breakStyle = accentColor
    ? ({ "--chapter-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        styles.chapterBreak,
        styles[visualStyle],
        isVisible && styles.visible,
        className
      )}
      style={breakStyle}
      role="separator"
      aria-label={`Chapter: ${chapter.name}`}
    >
      {/* Decorative line/element above */}
      <div className={styles.decorTop} aria-hidden="true">
        {visualStyle === "decorative" && (
          <svg
            className={styles.flourish}
            viewBox="0 0 100 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 10 Q25 0 50 10 Q75 20 100 10"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        )}
        {visualStyle === "minimal" && <div className={styles.line} />}
        {visualStyle === "dramatic" && <div className={styles.dramaticLine} />}
      </div>

      {/* Chapter content */}
      <div className={styles.content}>
        {showNumber && chapterNumber && (
          <span className={styles.number}>
            {String(chapterNumber).padStart(2, "0")}
            {totalChapters && (
              <span className={styles.totalChapters}>
                {" "}
                / {String(totalChapters).padStart(2, "0")}
              </span>
            )}
          </span>
        )}

        <h2 className={styles.title}>{chapter.name}</h2>

        {showSubtitle && chapter.subtitle && (
          <p className={styles.subtitle}>{chapter.subtitle}</p>
        )}
      </div>

      {/* Decorative line/element below */}
      <div className={styles.decorBottom} aria-hidden="true">
        {visualStyle === "decorative" && (
          <svg
            className={styles.flourish}
            viewBox="0 0 100 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 10 Q25 20 50 10 Q75 0 100 10"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        )}
        {visualStyle === "minimal" && <div className={styles.line} />}
        {visualStyle === "dramatic" && <div className={styles.dramaticLine} />}
      </div>
    </div>
  );
}

/**
 * Compact chapter indicator for inline use
 * Shows just the chapter name as a subtle label
 */
type ChapterLabelProps = {
  chapter: Chapter;
  accentColor?: string;
  className?: string;
};

export function ChapterLabel({
  chapter,
  accentColor,
  className,
}: ChapterLabelProps) {
  const labelStyle = accentColor
    ? ({ "--chapter-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={cn(styles.chapterLabel, className)} style={labelStyle}>
      <span className={styles.labelText}>{chapter.name}</span>
    </div>
  );
}
