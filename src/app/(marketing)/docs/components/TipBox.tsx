import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type TipBoxType = "tip" | "info" | "warning";

type TipBoxProps = {
  type?: TipBoxType;
  title?: string;
  children: ReactNode;
  className?: string;
};

const TYPE_CONFIG: Record<
  TipBoxType,
  { icon: string; bgClass: string; borderClass: string; titleClass: string }
> = {
  tip: {
    icon: "💡",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    titleClass: "text-emerald-700 dark:text-emerald-400",
  },
  info: {
    icon: "ℹ️",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    titleClass: "text-blue-700 dark:text-blue-400",
  },
  warning: {
    icon: "⚠️",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    titleClass: "text-amber-700 dark:text-amber-400",
  },
};

export function TipBox({
  type = "info",
  title,
  children,
  className,
}: TipBoxProps) {
  const config = TYPE_CONFIG[type];

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className="flex gap-3">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          {title && (
            <p className={cn("mb-1 font-semibold", config.titleClass)}>
              {title}
            </p>
          )}
          <div className="text-sm text-foreground/80">{children}</div>
        </div>
      </div>
    </div>
  );
}
