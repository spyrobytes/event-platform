/**
 * Floral Frame Divider — The Fine Art Romance
 *
 * A centered decorative ornament between sections — a small floral
 * motif flanked by thin gradient lines. Delicate and romantic.
 */

import type { DividerRendererProps } from "../../types";

export function FloralFrameDivider(_props: DividerRendererProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "clamp(8px, 2vw, 16px) 0",
        width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
        margin: "0 auto",
      }}
      aria-hidden="true"
    >
      {/* Left line */}
      <div
        style={{
          flex: 1,
          maxWidth: 120,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--border, #e8e1d6))",
        }}
      />
      {/* Center ornament — small diamond */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        style={{ flexShrink: 0, opacity: 0.4 }}
      >
        <path
          d="M6 0L12 6L6 12L0 6Z"
          fill="var(--accent, #7a8c72)"
        />
      </svg>
      {/* Right line */}
      <div
        style={{
          flex: 1,
          maxWidth: 120,
          height: 1,
          background: "linear-gradient(90deg, var(--border, #e8e1d6), transparent)",
        }}
      />
    </div>
  );
}
