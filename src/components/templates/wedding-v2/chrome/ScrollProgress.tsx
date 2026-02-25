"use client";

import { useState } from "react";
import styles from "./ScrollProgress.module.css";

type ScrollProgressProps = {
  accentColor: string;
};

/**
 * Thin accent-colored progress bar at the very top of the viewport.
 * Width tracks scroll position (0-100%).
 * Uses scroll event for simplicity; no layout thrash since we only write to a CSS variable.
 */
export function ScrollProgress({ accentColor }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  // Use a passive scroll listener via a ref callback on mount
  // to avoid the React hooks lint issues with useEffect + setState
  const containerRef = (node: HTMLDivElement | null) => {
    if (!node) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Clean up on unmount (React will call the ref with null)
    return () => window.removeEventListener("scroll", handleScroll);
  };

  return (
    <div
      ref={containerRef}
      className={styles.track}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div
        className={styles.bar}
        style={{
          width: `${progress}%`,
          backgroundColor: accentColor,
        }}
      />
    </div>
  );
}
