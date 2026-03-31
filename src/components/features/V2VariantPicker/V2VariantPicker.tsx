"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  getAllV2Variants,
  type V2VariantConfig,
  type V2VariantCategory,
  type V2CuratedSwatch,
} from "@/components/templates/wedding-v2/variants";

type V2VariantPickerProps = {
  /** Current variant ID, or empty string / undefined for "Original" (no variant) */
  value: string | undefined;
  onChange: (variantId: string) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Currently selected accent color — used to show active swatch */
  accentColor?: string;
  onAccentChange?: (hex: string) => void;
};

const CATEGORIES: { id: V2VariantCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "romantic", label: "Romantic" },
  { id: "earthy", label: "Earthy" },
  { id: "bold", label: "Bold" },
];

function PaletteDots({ swatches }: { swatches: V2CuratedSwatch[] }) {
  return (
    <div className="flex gap-1">
      {swatches.slice(0, 5).map((s, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full border border-black/10"
          style={{ backgroundColor: s.hex }}
        />
      ))}
    </div>
  );
}

function AccentSwatches({
  swatches,
  value,
  onChange,
  disabled,
}: {
  swatches: V2CuratedSwatch[];
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
      <span className="text-xs text-muted-foreground mr-1">Accent:</span>
      {swatches.map((swatch) => {
        const isActive = value.toLowerCase() === swatch.hex.toLowerCase();
        return (
          <button
            key={swatch.hex}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onChange(swatch.hex);
            }}
            title={swatch.label}
            className={cn(
              "h-6 w-6 rounded-full border-2 transition-all",
              isActive
                ? "border-foreground scale-110 shadow-sm"
                : "border-transparent hover:scale-105 hover:border-foreground/30",
              disabled && "cursor-not-allowed opacity-50",
            )}
            style={{ backgroundColor: swatch.hex }}
          >
            {isActive && (
              <svg
                className="mx-auto h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="sr-only">{swatch.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function V2VariantPicker({
  value,
  onChange,
  onClear,
  disabled,
  accentColor,
  onAccentChange,
}: V2VariantPickerProps) {
  const [activeCategory, setActiveCategory] = useState<V2VariantCategory | "all">("all");
  const variants = getAllV2Variants();
  const isOriginal = !value;

  const filtered = activeCategory === "all"
    ? variants
    : variants.filter((v) => v.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === id
                ? "bg-foreground text-background"
                : "bg-muted text-foreground/70 hover:bg-muted/80 hover:text-foreground",
            )}
            onClick={() => setActiveCategory(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Variant grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* "Original" card — resets to no variant */}
        {activeCategory === "all" && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className={cn(
              "group relative rounded-xl border-2 p-0 text-left transition-all overflow-hidden",
              isOriginal
                ? "border-foreground ring-2 ring-foreground/20 shadow-md"
                : "border-border hover:border-foreground/30",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div
              className="relative h-28 overflow-hidden"
              style={{ backgroundColor: "#f8f5f0" }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: "#7a8c72" }}
              />
              <div className="flex h-full items-center justify-center px-4">
                <span className="text-lg font-serif italic opacity-80" style={{ color: "#3d3830" }}>
                  Original
                </span>
              </div>
            </div>
            <div className="space-y-1.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Original Design</h4>
                {isOriginal && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                The default cinematic template with your custom theme settings
              </p>
            </div>
          </button>
        )}

        {filtered.map((variant) => {
          const isSelected = value === variant.id;
          const bgColor = variant.palette.bg || "#f8f5f0";
          const textColor = variant.palette.text || "#3d3830";
          const accentHex = variant.accentSwatches[0]?.hex || "#7a8c72";

          return (
            <div
              key={variant.id}
              className={cn(
                "group relative rounded-xl border-2 text-left transition-all overflow-hidden",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20 shadow-md"
                  : "border-border hover:border-foreground/30",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(variant.id)}
                className="w-full text-left"
              >
                {/* Color preview header */}
                <div
                  className="relative h-28 overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  {variant.thumbnail ? (
                    <Image
                      src={variant.thumbnail}
                      alt={variant.displayName}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <>
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{ backgroundColor: accentHex }}
                      />
                      <div className="flex h-full items-center justify-center px-4">
                        <span
                          className="text-lg font-serif italic opacity-80"
                          style={{ color: textColor }}
                        >
                          A & B
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{variant.displayName}</h4>
                    {isSelected && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {variant.description}
                  </p>
                  <PaletteDots swatches={variant.accentSwatches} />
                </div>
              </button>

              {/* Inline accent swatches — only on selected variant */}
              {isSelected && accentColor && onAccentChange && (
                <div className="px-3 pb-3">
                  <AccentSwatches
                    swatches={variant.accentSwatches}
                    value={accentColor}
                    onChange={onAccentChange}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
