"use client";

import { cn } from "@/lib/utils";

export type SegmentedRadioOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedRadioGroupProps<T extends string> = {
  /** Accessible name for the radiogroup. */
  ariaLabel: string;
  options: ReadonlyArray<SegmentedRadioOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * A row of equal-width segmented radio buttons — the editor's standard
 * curated-choice toggle (Display Style, Background Treatment, Photo Frame).
 * Single source for the button styling, focus ring, aria pattern, and
 * disabled treatment.
 */
export function SegmentedRadioGroup<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedRadioGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex gap-2", className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2",
              active ? "border-foreground shadow-sm" : "border-border hover:border-foreground/30",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
