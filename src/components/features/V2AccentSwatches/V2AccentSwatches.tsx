"use client";

import { cn } from "@/lib/utils";
import type { V2CuratedSwatch } from "@/components/templates/wedding-v2/variants";

type V2AccentSwatchesProps = {
  swatches: V2CuratedSwatch[];
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
};

export function V2AccentSwatches({ swatches, value, onChange, disabled }: V2AccentSwatchesProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Accent Color</p>
      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => {
          const isActive = value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.hex}
              type="button"
              disabled={disabled}
              onClick={() => onChange(swatch.hex)}
              title={swatch.label}
              className={cn(
                "group relative h-9 w-9 rounded-full border-2 transition-all",
                isActive
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent hover:scale-105 hover:border-foreground/30",
                disabled && "cursor-not-allowed opacity-50",
              )}
              style={{ backgroundColor: swatch.hex }}
            >
              {isActive && (
                <svg
                  className="absolute inset-0 m-auto h-4 w-4"
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
      {swatches.find((s) => s.hex.toLowerCase() === value.toLowerCase()) && (
        <p className="text-xs text-muted-foreground">
          {swatches.find((s) => s.hex.toLowerCase() === value.toLowerCase())!.label}
        </p>
      )}
    </div>
  );
}
