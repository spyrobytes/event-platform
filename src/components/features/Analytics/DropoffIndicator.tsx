import { cn } from "@/lib/utils";

type DropoffIndicatorProps = {
  lostCount: number;
  dropoffRate: number;
  className?: string;
};

/**
 * Shows drop-off between two funnel stages
 * Displays the number lost and percentage
 */
export function DropoffIndicator({
  lostCount,
  dropoffRate,
  className,
}: DropoffIndicatorProps) {
  // Determine severity color
  const severityColor =
    dropoffRate >= 50
      ? "text-red-600 dark:text-red-400"
      : dropoffRate >= 25
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  // Don't show if no drop-off
  if (lostCount === 0) {
    return (
      <div className={cn("flex items-center justify-center py-1", className)}>
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          ✓ No drop-off
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2 py-1", className)}>
      <div className="flex items-center gap-1.5">
        <svg
          className={cn("h-3 w-3", severityColor)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <span className={cn("text-xs font-medium", severityColor)}>
          {dropoffRate}% drop-off
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        ({lostCount.toLocaleString()} lost)
      </span>
    </div>
  );
}
