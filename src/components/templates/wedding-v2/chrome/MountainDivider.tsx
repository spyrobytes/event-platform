type MountainDividerProps = {
  flip?: boolean;
  color?: string;
  className?: string;
  variant?: "section" | "footer";
};

/**
 * Mountain Divider — POC-parity stroke-only SVG
 *
 * Stroke-only path with peak dots, not filled waves.
 * Uses slightly varied paths for visual variety.
 */

const PATHS = [
  "M0 64 L0 42 L80 28 L160 36 L240 18 L340 32 L400 12 L480 26 L540 8 L600 22 L660 14 L720 30 L800 6 L880 24 L940 16 L1000 28 L1060 10 L1120 22 L1200 38 L1200 64Z",
  "M0 64 L0 38 L100 26 L200 34 L300 14 L380 28 L460 8 L540 20 L620 12 L700 32 L780 4 L860 20 L940 14 L1020 26 L1100 16 L1200 30 L1200 64Z",
  "M0 64 L0 34 L120 22 L220 30 L320 10 L420 26 L500 4 L580 18 L660 10 L740 28 L840 8 L920 22 L1000 12 L1080 24 L1200 36 L1200 64Z",
  "M0 64 L0 40 L140 28 L260 36 L360 12 L440 26 L520 6 L620 22 L700 10 L780 30 L860 8 L960 24 L1060 14 L1200 32 L1200 64Z",
];

/** Peak dot positions for each path variant */
const PEAK_DOTS: [number, number][][] = [
  [[540, 8], [800, 6]],
  [[460, 8], [780, 4]],
  [[500, 4], [840, 8]],
  [[520, 6], [860, 8]],
];

export function MountainDivider({
  flip = false,
  className = "",
  variant = "section",
}: MountainDividerProps) {
  // Vary path based on flip to get visual variety
  const pathIndex = flip ? 1 : 0;
  // Use modular selection for more variety
  const variedIndex = pathIndex % PATHS.length;
  const path = PATHS[variedIndex];
  const dots = PEAK_DOTS[variedIndex];

  if (variant === "footer") {
    return (
      <svg
        className={className}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          color: "var(--cream, #f0ebe3)",
          background: "var(--ivory, #f8f5f0)",
        }}
      >
        <path
          d="M0 80 L0 50 L60 42 L120 48 L180 32 L240 44 L300 26 L360 38 L420 20 L480 34 L540 16 L600 30 L660 12 L720 28 L780 8 L840 24 L900 14 L960 30 L1020 18 L1080 32 L1140 22 L1200 36 L1260 28 L1320 40 L1380 34 L1440 44 L1440 80Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 1200 64"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        display: "block",
        margin: "var(--section-y, 96px) auto",
        maxWidth: 280,
        height: 32,
        color: "var(--sand, #d4cabb)",
        opacity: 0.5,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      {dots.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.5"
          fill="currentColor"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}
