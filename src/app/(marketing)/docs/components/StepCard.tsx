import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StepCardProps = {
  stepNumber: number;
  title: string;
  description: string;
  details?: string[];
  icon?: ReactNode;
  className?: string;
};

export function StepCard({
  stepNumber,
  title,
  description,
  details,
  icon,
  className,
}: StepCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {stepNumber}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <p className="mt-1 text-muted-foreground">{description}</p>
          {details && details.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {details.map((detail, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
