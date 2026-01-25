import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type FeatureBoxProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  highlights?: string[];
  className?: string;
};

export function FeatureBox({
  title,
  description,
  icon,
  highlights,
  className,
}: FeatureBoxProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 transition-colors hover:bg-muted/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {icon}
          </span>
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {highlights && highlights.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {highlights.map((highlight, index) => (
                <li
                  key={index}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
