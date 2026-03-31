import type React from "react";

type BotanicalProps = {
  variant?: "sage" | "gold" | "rose";
  style?: React.CSSProperties;
};

const STEMS: Record<string, React.ReactNode> = {
  a: (
    <svg viewBox="0 0 100 180" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
      <path d="M50 180 Q50 120 48 80 Q46 50 50 10" />
      <path d="M50 140 Q30 120 15 130" opacity=".7" />
      <path d="M50 120 Q70 95 82 100" opacity=".7" />
      <path d="M50 95 Q28 75 18 85" opacity=".6" />
      <path d="M50 70 Q72 52 80 58" opacity=".6" />
      <path d="M50 50 Q35 35 25 42" opacity=".5" />
      <path d="M50 32 Q62 22 68 28" opacity=".4" />
    </svg>
  ),
  b: (
    <svg viewBox="0 0 80 140" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
      <path d="M40 140 Q40 90 38 50 Q36 25 40 5" />
      <path d="M40 110 Q22 95 12 102" />
      <path d="M40 85 Q58 68 66 74" />
      <path d="M40 60 Q24 48 16 54" />
      <path d="M40 38 Q54 28 60 34" />
    </svg>
  ),
  c: (
    <svg viewBox="0 0 90 150" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
      <path d="M45 150 Q45 100 43 60 Q41 30 45 5" />
      <path d="M45 120 Q28 105 18 112" />
      <path d="M45 95 Q62 80 70 86" />
      <path d="M45 70 Q30 58 22 64" />
      <path d="M45 48 Q58 38 64 44" />
    </svg>
  ),
  d: (
    <svg viewBox="0 0 100 160" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
      <path d="M50 160 C50 120 48 80 50 20" />
      <path d="M50 130 C35 115 20 120 15 128" />
      <path d="M50 105 C65 88 78 92 82 100" />
      <path d="M50 80 C38 68 25 72 22 78" />
      <path d="M50 55 C62 44 72 48 74 54" />
    </svg>
  ),
};

const STEM_KEYS = Object.keys(STEMS);

export function Botanical({ variant = "sage", style }: BotanicalProps) {
  // Deterministic variant based on position (top/right from style)
  const idx = Math.abs(
    ((style?.top ? parseInt(String(style.top)) : 0) +
      (style?.right ? parseInt(String(style.right)) : 0)) % STEM_KEYS.length
  );
  const stemKey = STEM_KEYS[idx];

  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "none",
        opacity: 0.08,
        color: variant === "gold"
          ? "var(--gold-l, #ddc07a)"
          : variant === "rose"
            ? "var(--rose, #c4918a)"
            : "var(--accent, #7a8c72)",
        ...style,
      }}
      aria-hidden="true"
    >
      {STEMS[stemKey]}
    </div>
  );
}
