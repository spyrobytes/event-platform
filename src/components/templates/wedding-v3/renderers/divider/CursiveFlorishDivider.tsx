/**
 * Cursive Flourish Divider — The Intimate Note
 *
 * A delicate ornamental divider: thin rules flanking a small
 * decorative flourish (swash). Centered, quiet, intimate.
 */

import type { DividerRendererProps } from "../../types";

export function CursiveFlourishDivider(_props: DividerRendererProps) {
  return (
    <div
      style={{
        width: "min(var(--max, 800px), 100% - 2 * var(--pad, 40px))",
        margin: "0 auto",
        padding: "clamp(4px, 1vw, 8px) 0",
        display: "flex",
        alignItems: "center",
        gap: "clamp(12px, 2vw, 20px)",
      }}
      aria-hidden="true"
    >
      {/* Left rule */}
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--border, #e8e1d6))",
        }}
      />

      {/* Flourish — small decorative swash */}
      <svg
        width="28"
        height="14"
        viewBox="0 0 28 14"
        fill="none"
        style={{ flexShrink: 0, opacity: 0.4 }}
      >
        <path
          d="M2 12C6 4 10 2 14 7C18 2 22 4 26 12"
          stroke="var(--accent, #7a8c72)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Right rule */}
      <div
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, var(--border, #e8e1d6), transparent)",
        }}
      />
    </div>
  );
}
