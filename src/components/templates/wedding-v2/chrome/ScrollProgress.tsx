"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollProgress.module.css";

type ScrollProgressProps = {
  accentColor: string;
};

/**
 * Scroll Progress — POC-parity
 *
 * 2px gradient bar (sage-l → sage → gold-l) at the top of viewport.
 * Uses direct DOM manipulation for performance (no re-renders).
 */
export function ScrollProgress(_props: ScrollProgressProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? `${(window.scrollY / h) * 100}%` : "0%";
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        ref={barRef}
        className={styles.bar}
        style={{
          background: "linear-gradient(90deg, var(--sage-l, #a8b8a0), var(--accent, #7a8c72), var(--gold-l, #ddc07a))",
        }}
      />
    </div>
  );
}
