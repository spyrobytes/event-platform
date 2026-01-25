import { cn } from "@/lib/utils";
import type { VelocityTrend } from "@/lib/analytics";

type MomentumIndicatorProps = {
  trend: VelocityTrend;
  percentChange: number;
  current7Days: number;
  previous7Days: number;
  className?: string;
};

const TREND_CONFIG: Record<
  VelocityTrend,
  { label: string; icon: string; colorClass: string; bgClass: string }
> = {
  accelerating: {
    label: "Accelerating",
    icon: "↑",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  steady: {
    label: "Steady",
    icon: "→",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
  },
  slowing: {
    label: "Slowing",
    icon: "↓",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
  },
};

/**
 * Momentum Indicator Component
 *
 * Shows the current momentum trend by comparing RSVP activity
 * over the last 7 days vs the previous 7 days.
 */
export function MomentumIndicator({
  trend,
  percentChange,
  current7Days,
  previous7Days,
  className,
}: MomentumIndicatorProps) {
  const config = TREND_CONFIG[trend];

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-4",
        config.bgClass,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Response Momentum
          </p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-lg font-semibold",
                config.colorClass
              )}
            >
              <span className="text-xl">{config.icon}</span>
              {config.label}
            </span>
            {percentChange !== 0 && (
              <span className={cn("text-sm font-medium", config.colorClass)}>
                {percentChange > 0 ? "+" : ""}
                {percentChange}%
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold">{current7Days}</p>
          <p className="text-xs text-muted-foreground">
            RSVPs this week
            {previous7Days > 0 && (
              <span className="block">vs {previous7Days} last week</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
