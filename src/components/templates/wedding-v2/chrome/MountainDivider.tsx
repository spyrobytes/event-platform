type MountainDividerProps = {
  flip?: boolean;
  color?: string;
  className?: string;
};

/**
 * SVG mountain-range silhouette divider placed between sections.
 * Accepts `flip` prop for alternating direction.
 * Uses CSS variables for color theming.
 */
export function MountainDivider({
  flip = false,
  color,
  className = "",
}: MountainDividerProps) {
  const fillColor = color || "var(--wedding-background, #FFFAF8)";

  return (
    <div
      className={className}
      style={{
        transform: flip ? "scaleX(-1)" : undefined,
        lineHeight: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <path
          d="M0 80L48 72C96 64 192 48 288 44C384 40 480 48 576 50C672 52 768 48 864 42C960 36 1056 28 1152 30C1248 32 1344 44 1392 50L1440 56V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z"
          fill={fillColor}
          fillOpacity="0.5"
        />
        <path
          d="M0 80L60 68C120 56 240 32 360 28C480 24 600 40 720 46C840 52 960 48 1080 40C1200 32 1320 20 1380 14L1440 8V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
          fill={fillColor}
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}
