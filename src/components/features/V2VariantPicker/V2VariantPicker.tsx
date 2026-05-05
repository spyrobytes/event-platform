"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  getCuratedSkins,
  type V2CuratedSwatch,
  type V2VariantConfig,
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
  const skins = getCuratedSkins();
  const originalSkins = skins.filter((s) => s.family === "original");
  const scrapbookSkins = skins.filter((s) => s.family === "scrapbook");
  const isOriginal = !value;

  const renderSkinCard = (skin: V2VariantConfig) => {
    const isSelected = value === skin.id;
    const bgColor = skin.palette.bg || "#0d1b2a";
    const accentHex = skin.accentSwatches[0]?.hex || "#c5a55a";

    return (
      <div
        key={skin.id}
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
          onClick={() => onChange(skin.id)}
          className="w-full text-left"
        >
          <div
            className="relative h-24 overflow-hidden"
            style={{ backgroundColor: bgColor }}
          >
            {skin.thumbnail ? (
              <Image
                src={skin.thumbnail}
                alt={skin.displayName}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <>
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: accentHex }}
                />
                <div className="flex h-full items-center justify-center px-4">
                  <span
                    className="text-base font-serif italic"
                    style={{ color: accentHex, opacity: 0.9 }}
                  >
                    A & B
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-1 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{skin.displayName}</h4>
              {isSelected && (
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {skin.description}
            </p>
          </div>
        </button>

        {isSelected && accentColor && onAccentChange && (
          <div className="px-3 pb-3">
            <AccentSwatches
              swatches={skin.accentSwatches}
              value={accentColor}
              onChange={onAccentChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Original
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* "Original" card — resets to no variant (light mode) */}
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
              className="relative h-24 overflow-hidden"
              style={{ backgroundColor: "#f8f5f0" }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: "#7a8c72" }}
              />
              <div className="flex h-full items-center justify-center px-4">
                <span className="text-base font-serif italic opacity-80" style={{ color: "#3d3830" }}>
                  Original
                </span>
              </div>
            </div>
            <div className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Light (Default)</h4>
                {isOriginal && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                Warm cream with your custom accent color
              </p>
            </div>
          </button>

          {originalSkins.map(renderSkinCard)}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Scrapbook
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scrapbookSkins.map(renderSkinCard)}
        </div>
      </section>
    </div>
  );
}
