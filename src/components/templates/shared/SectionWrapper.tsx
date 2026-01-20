import { cn } from "@/lib/utils";

type SectionWrapperProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

/**
 * Wrapper component for template sections
 * Provides consistent spacing and semantic HTML
 */
export function SectionWrapper({
  children,
  className,
  id,
  ariaLabel,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn("py-12 md:py-16", className)}
    >
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}

type SectionTitleProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
};

/**
 * Consistent section title styling
 */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: SectionTitleProps) {
  return (
    <Tag
      className={cn(
        "mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}
