import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DocSectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DocSection({
  id,
  title,
  description,
  children,
  className,
}: DocSectionProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 py-12 first:pt-0", className)}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
