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
  // Characters are grouped by word: per-char inline-block spans break lines
  // anywhere, so long names would wrap mid-word ("Montgo/mery"). Each word
  // gets a nowrap wrapper and words are joined by regular spaces, restoring
  // word-boundary wrapping while keeping the per-character scatter (char
  // indices stay continuous across the full text for the Z/stagger hash).
  const words = useMemo(() => {
    let charIndex = 0;
    return text.split(" ").map((word) => ({
      chars: word.split("").map((char) => {
        const i = charIndex++;
        return {
          char,
          index: i,
          scatterZ: ((((i + 1) * 137.508) % 1) * depth + 80).toFixed(0),
        };
      }),
    }));
  }, [text, depth]);

  return (
    <span
      className={className}
      style={{ display: "inline-block", transformStyle: "preserve-3d" }}
    >
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && " "}
          <span
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              transformStyle: "preserve-3d",
            }}
          >
            {word.chars.map((c) => (
              <span
                key={c.index}
                style={{
                  display: "inline-block",
                  transformStyle: "preserve-3d",
                  transform: active
                    ? "translateZ(0)"
                    : `translateZ(${c.scatterZ}px)`,
                  transition: `transform 1.3s ${stagger * c.index}s cubic-bezier(0.4, 0, 0.2, 1)`,
                  willChange: active ? "auto" : "transform",
                }}
              >
                {c.char}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
