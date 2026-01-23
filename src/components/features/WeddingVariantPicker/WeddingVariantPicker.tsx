"use client";

import { cn } from "@/lib/utils";
import {
  getAllVariantsDisplayInfo,
  type VariantDisplayInfo,
} from "@/components/templates/wedding";

type WeddingVariantPickerProps = {
  value: string | null;
  onChange: (variantId: string) => void;
  disabled?: boolean;
  showDescription?: boolean;
  size?: "compact" | "normal" | "large";
};

/**
 * Icons for each wedding variant
 */
const VARIANT_ICONS: Record<string, string> = {
  classic: "💒",
  modern_minimal: "🏙️",
  rustic_outdoor: "🌿",
  destination: "✈️",
  intimate_micro: "💕",
};

/**
 * Background colors for each variant preview
 */
const VARIANT_BACKGROUNDS: Record<string, string> = {
  classic: "#FFFAF8",
  modern_minimal: "#FAFAFA",
  rustic_outdoor: "#FAF8F5",
  destination: "#F8FBFC",
  intimate_micro: "#FDFAFC",
};

/**
 * Wedding Variant Picker Component
 *
 * Allows users to select from available wedding template variants.
 * Displays visual previews with color theming and descriptions.
 */
export function WeddingVariantPicker({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  size = "normal",
}: WeddingVariantPickerProps) {
  const variants = getAllVariantsDisplayInfo();

  const sizeClasses = {
    compact: "p-3",
    normal: "p-4",
    large: "p-6",
  };

  const iconSizes = {
    compact: "text-2xl",
    normal: "text-3xl",
    large: "text-4xl",
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose Your Wedding Style</h3>
        <p className="text-sm text-muted-foreground">
          Select the design that best matches your celebration
        </p>
      </div>

      {/* Variant grid */}
      <div
        className={cn(
          "grid gap-4",
          size === "compact" ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"
        )}
        role="radiogroup"
        aria-label="Select a wedding variant"
      >
        {variants.map((variant) => {
          const isSelected = value === variant.id;
          const icon = VARIANT_ICONS[variant.id] || "💍";
          const background = VARIANT_BACKGROUNDS[variant.id] || "#FFFFFF";

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(variant.id)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
                sizeClasses[size],
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-60"
              )}
              style={{
                backgroundColor: background,
                "--tw-ring-color": variant.accentColor,
              } as React.CSSProperties}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: variant.accentColor }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Variant preview */}
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg",
                    iconSizes[size],
                    size === "compact" ? "h-10 w-10" : "h-12 w-12"
                  )}
                  style={{ backgroundColor: `${variant.accentColor}20` }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "font-semibold truncate",
                      size === "compact" ? "text-sm" : "text-base"
                    )}
                    style={{ color: variant.accentColor }}
                  >
                    {variant.displayName}
                  </h4>
                  {size !== "compact" && (
                    <p className="text-xs text-muted-foreground">
                      {variant.category.charAt(0).toUpperCase() + variant.category.slice(1)} variant
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {showDescription && size !== "compact" && (
                <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                  {variant.description}
                </p>
              )}

              {/* Best for tags */}
              {size === "large" && variant.bestFor.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {variant.bestFor.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: `${variant.accentColor}15`,
                        color: variant.accentColor,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Preview bar */}
              <div
                className={cn(
                  "mt-auto rounded-full",
                  size === "compact" ? "h-1" : "h-1.5"
                )}
                style={{ backgroundColor: variant.accentColor }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Get variant display info by ID
 */
export function getVariantInfo(variantId: string): VariantDisplayInfo | undefined {
  const variants = getAllVariantsDisplayInfo();
  return variants.find((v) => v.id === variantId);
}
