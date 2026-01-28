"use client";

import { cn } from "@/lib/utils";
import {
  themes,
  themeMetadata,
  type ThemeId,
} from "@/lib/invitation-themes";

type ThemePickerProps = {
  /** Currently selected theme */
  value: ThemeId;
  /** Callback when theme changes */
  onChange: (themeId: ThemeId) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Visual theme picker for invitation configuration.
 *
 * Displays color swatches for each theme with labels and selection state.
 *
 * @example
 * ```tsx
 * <ThemePicker
 *   value={selectedTheme}
 *   onChange={setSelectedTheme}
 * />
 * ```
 */
export function ThemePicker({
  value,
  onChange,
  disabled = false,
  className,
}: ThemePickerProps) {
  const themeIds = Object.keys(themes) as ThemeId[];

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-foreground">
        Color Theme
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {themeIds.map((themeId) => {
          const theme = themes[themeId];
          const meta = themeMetadata[themeId];
          const isSelected = value === themeId;

          return (
            <button
              key={themeId}
              type="button"
              onClick={() => onChange(themeId)}
              disabled={disabled}
              className={cn(
                "group relative flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50 bg-surface",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={isSelected}
              aria-label={`${meta.name} theme: ${meta.description}`}
            >
              {/* Color swatches */}
              <div className="flex gap-1 mb-2">
                <div
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: theme["--inv-card-bg"] }}
                  title="Background"
                />
                <div
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: theme["--inv-envelope-color"] }}
                  title="Envelope"
                />
                <div
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: theme["--inv-accent"] }}
                  title="Accent"
                />
              </div>

              {/* Theme name */}
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {meta.name}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
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
            </button>
          );
        })}
      </div>
      {/* Description of selected theme */}
      <p className="text-sm text-muted-foreground">
        {themeMetadata[value].description}
      </p>
    </div>
  );
}
