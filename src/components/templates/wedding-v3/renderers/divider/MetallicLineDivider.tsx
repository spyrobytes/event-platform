/**
 * Metallic Line Divider — The Grand Luxe
 *
 * A centered metallic accent line — subtle, premium,
 * with gradient fade to transparent at edges.
 */

import type { DividerRendererProps } from "../../types";

export function MetallicLineDivider(_props: DividerRendererProps) {
  return (
    <div
      style={{
        width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
        margin: "0 auto",
        padding: "clamp(4px, 1vw, 8px) 0",
        display: "flex",
        justifyContent: "center",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: "clamp(80px, 12vw, 160px)",
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--accent, #c5a55a), transparent)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}
