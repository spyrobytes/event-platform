/**
 * Organic Curve Divider — The Garden House
 *
 * A subtle wavy SVG line — organic and natural, replacing the
 * sharp mountain SVGs with soft flowing curves.
 */

import type { DividerRendererProps } from "../../types";

export function OrganicCurveDivider({ flip }: DividerRendererProps) {
  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        lineHeight: 0,
        transform: flip ? "scaleY(-1)" : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: "clamp(16px, 3vw, 32px)",
        }}
      >
        <path
          d="M0,20 Q240,0 480,20 Q720,40 960,20 Q1200,0 1440,20"
          fill="none"
          stroke="var(--border, #e8e1d6)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
