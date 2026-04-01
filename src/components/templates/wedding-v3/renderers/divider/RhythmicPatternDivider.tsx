/**
 * Rhythmic Pattern Divider — The Celebration House
 *
 * A row of small dots in the accent color — playful, rhythmic,
 * like confetti dots or a decorative pattern border.
 */

import type { DividerRendererProps } from "../../types";

export function RhythmicPatternDivider(_props: DividerRendererProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "clamp(8px, 2vw, 16px) 0",
      }}
      aria-hidden="true"
    >
      {[0.2, 0.4, 0.6, 0.8, 1, 0.8, 0.6, 0.4, 0.2].map((opacity, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--accent, #7a8c72)",
            opacity,
          }}
        />
      ))}
    </div>
  );
}
