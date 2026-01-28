"use client";

import { cn } from "@/lib/utils";
import {
  typographyPairs,
  typographyMetadata,
  type TypographyPair,
} from "@/lib/invitation-themes";

type TypographyPickerProps = {
  /** Currently selected typography pair */
  value: TypographyPair;
  /** Callback when typography changes */
  onChange: (pair: TypographyPair) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Typography pair picker for invitation configuration.
 *
 * Shows font previews for each typography combination.
 *
 * @example
 * ```tsx
 * <TypographyPicker
 *   value={selectedTypography}
 *   onChange={setSelectedTypography}
 * />
 * ```
 */
export function TypographyPicker({
  value,
  onChange,
  disabled = false,
  className,
}: TypographyPickerProps) {
  const pairs = Object.keys(typographyPairs) as TypographyPair[];

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-foreground">
        Typography Style
      </label>
      <div className="grid gap-3">
        {pairs.map((pair) => {
          const fonts = typographyPairs[pair];
          const meta = typographyMetadata[pair];
          const isSelected = value === pair;

          return (
            <button
              key={pair}
              type="button"
              onClick={() => onChange(pair)}
              disabled={disabled}
              className={cn(
                "group relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50 bg-surface",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              aria-label={`${meta.name} typography: ${meta.description}`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {meta.name}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-accent-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Font preview */}
              <div className="space-y-1 w-full">
                <p
                  className="text-2xl truncate"
                  style={{ fontFamily: fonts.script }}
                >
                  Sarah & James
                </p>
                <p
                  className="text-lg truncate"
                  style={{ fontFamily: fonts.heading }}
                >
                  Request Your Presence
                </p>
                <p
                  className="text-sm text-muted-foreground truncate"
                  style={{ fontFamily: fonts.body }}
                >
                  Saturday, June 15th at 4:00 PM
                </p>
              </div>

              {/* Font names */}
              <p className="text-xs text-muted-foreground mt-2">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
