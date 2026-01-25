import { cn } from "@/lib/utils";

type WorkflowDiagramProps = {
  steps: string[];
  title?: string;
  className?: string;
};

export function WorkflowDiagram({
  steps,
  title,
  className,
}: WorkflowDiagramProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)}>
      {title && (
        <h4 className="mb-4 text-center text-sm font-semibold text-muted-foreground">
          {title}
        </h4>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{step}</span>
            </div>
            {index < steps.length - 1 && (
              <svg
                className="h-4 w-4 shrink-0 text-muted-foreground"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
