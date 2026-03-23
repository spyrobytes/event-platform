type MountainDividerProps = {
  flip?: boolean;
  color?: string;
  className?: string;
  variant?: "section" | "footer";
  /** Index used to cycle through divider pattern types (mountain, river, treeline) */
  dividerIndex?: number;
};

/**
 * Section Divider — cycles through mountain, river, and treeline patterns
 *
 * Pattern types based on dividerIndex % 3:
 *   0 → mountain (stroke-only peaks with dots)
 *   1 → river (flowing ribbon curves)
 *   2 → treeline (angular tree silhouettes)
 *
 * Export name kept as MountainDivider for backward compatibility.
 */

/* ── Mountain paths ── */

const MOUNTAIN_PATHS = [
  "M0 64 L0 42 L80 28 L160 36 L240 18 L340 32 L400 12 L480 26 L540 8 L600 22 L660 14 L720 30 L800 6 L880 24 L940 16 L1000 28 L1060 10 L1120 22 L1200 38 L1200 64Z",
  "M0 64 L0 38 L100 26 L200 34 L300 14 L380 28 L460 8 L540 20 L620 12 L700 32 L780 4 L860 20 L940 14 L1020 26 L1100 16 L1200 30 L1200 64Z",
  "M0 64 L0 34 L120 22 L220 30 L320 10 L420 26 L500 4 L580 18 L660 10 L740 28 L840 8 L920 22 L1000 12 L1080 24 L1200 36 L1200 64Z",
  "M0 64 L0 40 L140 28 L260 36 L360 12 L440 26 L520 6 L620 22 L700 10 L780 30 L860 8 L960 24 L1060 14 L1200 32 L1200 64Z",
];

/** Peak dot positions for each mountain path variant */
const MOUNTAIN_DOTS: [number, number][][] = [
  [[540, 8], [800, 6]],
  [[460, 8], [780, 4]],
  [[500, 4], [840, 8]],
  [[520, 6], [860, 8]],
];

/* ── Divider type enum ── */

type DividerType = "mountain" | "river" | "treeline";

const DIVIDER_TYPES: DividerType[] = ["mountain", "river", "treeline"];

/* ── Pattern renderers ── */

function RiverPattern({ flip }: { flip: boolean }) {
  return (
    <svg
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
        d="M0 32 C100 20, 200 44, 300 32 S500 16, 600 32 S800 48, 900 32 S1100 16, 1200 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".8"
      />
      <path
        d="M0 36 C100 24, 200 48, 300 36 S500 20, 600 36 S800 52, 900 36 S1100 20, 1200 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity=".4"
      />
      <circle cx="300" cy="32" r="2" fill="currentColor" opacity=".4" />
      <circle cx="900" cy="32" r="2" fill="currentColor" opacity=".4" />
    </svg>
  );
}

function TreelinePattern({ flip }: { flip: boolean }) {
  return (
    <svg
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
        d="M0 64 L40 64 L45 38 L50 64 L90 64 L95 42 L100 64 L140 64 L148 32 L156 64 L200 64 L205 40 L210 64 L260 64 L268 28 L276 64 L330 64 L336 36 L342 64 L400 64 L406 30 L412 64 L470 64 L478 24 L486 64 L540 64 L545 34 L550 64 L600 64 L608 26 L616 64 L680 64 L686 32 L692 64 L740 64 L748 20 L756 64 L810 64 L815 38 L820 64 L880 64 L888 28 L896 64 L950 64 L956 34 L962 64 L1020 64 L1028 22 L1036 64 L1090 64 L1095 36 L1100 64 L1160 64 L1166 30 L1172 64 L1200 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="478" cy="24" r="2" fill="currentColor" opacity=".4" />
      <circle cx="748" cy="20" r="2" fill="currentColor" opacity=".4" />
    </svg>
  );
}

export function MountainDivider({
  flip = false,
  className = "",
  variant = "section",
  dividerIndex = 0,
}: MountainDividerProps) {
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

  // Determine divider type by cycling through the 3 patterns
  const dividerType = DIVIDER_TYPES[Math.abs(dividerIndex) % 3];

  if (dividerType === "river") {
    return <RiverPattern flip={flip} />;
  }

  if (dividerType === "treeline") {
    return <TreelinePattern flip={flip} />;
  }

  // Mountain pattern — vary path based on flip for visual variety
  const pathIndex = flip ? 1 : 0;
  const variedIndex = pathIndex % MOUNTAIN_PATHS.length;
  const path = MOUNTAIN_PATHS[variedIndex];
  const dots = MOUNTAIN_DOTS[variedIndex];

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
