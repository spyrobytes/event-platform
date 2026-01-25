import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "flat";

type KPICardProps = {
  label: string;
  value: number | string;
  format?: "number" | "percent" | "days";
  subtitle?: string;
  trend?: {
    value: number;
    direction: TrendDirection;
  };
  variant?: "default" | "success" | "warning" | "muted";
  className?: string;
};

const VARIANT_STYLES: Record<NonNullable<KPICardProps["variant"]>, string> = {
  default: "bg-card border-border",
  success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  muted: "bg-muted/50 border-border",
};

const TREND_COLORS: Record<TrendDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
};

const TREND_ICONS: Record<TrendDirection, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

function formatValue(value: number | string, format?: KPICardProps["format"]): string {
  if (typeof value === "string") return value;

  switch (format) {
    case "percent":
      return `${value}%`;
    case "days":
      return value === 1 ? "1 day" : `${value} days`;
    case "number":
    default:
      return value.toLocaleString();
  }
}

/**
 * KPI Card Component
 *
 * Displays a single key performance indicator with optional trend.
 * Used in the analytics dashboard to show high-level metrics.
 */
export function KPICard({
  label,
  value,
  format = "number",
  subtitle,
  trend,
  variant = "default",
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              TREND_COLORS[trend.direction]
            )}
          >
            <span>{TREND_ICONS[trend.direction]}</span>
            <span>{trend.value}%</span>
          </span>
        )}
      </div>

      <p className="mt-2 text-3xl font-bold tracking-tight">
        {formatValue(value, format)}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
