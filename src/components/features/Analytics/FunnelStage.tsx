import { cn } from "@/lib/utils";

type FunnelStageProps = {
  label: string;
  count: number;
  percentage: number;
  isFirst?: boolean;
  className?: string;
};

/**
 * Single stage in the RSVP funnel visualization
 * Displays a horizontal bar representing the percentage of the total
 */
export function FunnelStage({
  label,
  count,
  percentage,
  isFirst = false,
  className,
}: FunnelStageProps) {
  // Determine bar color based on position in funnel
  const barColor = isFirst
    ? "bg-primary"
    : percentage >= 50
      ? "bg-emerald-500"
      : percentage >= 25
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count.toLocaleString()} ({percentage}%)
        </span>
      </div>

      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out",
            barColor
          )}
          style={{ width: `${percentage}%` }}
        />

        {/* Inner label for larger bars */}
        {percentage >= 20 && (
          <div className="absolute inset-0 flex items-center px-3">
            <span className="text-xs font-medium text-white drop-shadow-sm">
              {percentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
