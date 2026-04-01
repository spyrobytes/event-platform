/**
 * Thin Rule Divider — The Editorial
 *
 * A single 1px horizontal rule centered in the content area.
 * The most restrained divider possible — pure editorial simplicity.
 */

import type { DividerRendererProps } from "../../types";

export function ThinRuleDivider(_props: DividerRendererProps) {
  return (
    <div
      style={{
        width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))",
        margin: "0 auto",
        padding: "clamp(4px, 1vw, 8px) 0",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          height: 1,
          background: "var(--border, #e8e1d6)",
        }}
      />
    </div>
  );
}
