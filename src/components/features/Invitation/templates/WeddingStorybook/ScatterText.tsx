"use client";

import { useMemo } from "react";

type ScatterTextProps = {
  text: string;
  active: boolean;
  className?: string;
  /** Max Z-depth (px) for scattered state. Default 500 */
  depth?: number;
  /** Per-character stagger delay (s). Default 0.025 */
  stagger?: number;
};

/**
 * Splits text into individual characters that scatter in Z-space
 * when inactive and assemble into place when active.
 *
 * Uses deterministic pseudo-random values from char index (golden ratio hash).
 */
export function ScatterText({
  text,
  active,
  className,
  depth = 500,
  stagger = 0.025,
}: ScatterTextProps) {
  const chars = useMemo(() => {
    return text.split("").map((char, i) => ({
      char,
      scatterZ: ((((i + 1) * 137.508) % 1) * depth + 80).toFixed(0),
    }));
  }, [text, depth]);

  return (
    <span
      className={className}
      style={{ display: "inline-block", transformStyle: "preserve-3d" }}
    >
      {chars.map((c, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            transformStyle: "preserve-3d",
            transform: active ? "translateZ(0)" : `translateZ(${c.scatterZ}px)`,
            transition: `transform 1.3s ${stagger * i}s cubic-bezier(0.4, 0, 0.2, 1)`,
            willChange: active ? "auto" : "transform",
          }}
        >
          {c.char === " " ? "\u00A0" : c.char}
        </span>
      ))}
    </span>
  );
}
