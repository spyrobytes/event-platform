"use client";

import { cn } from "@/lib/utils";
import { isLightColor, HEX6_RE } from "@/lib/color";
import type { SectionTheme } from "@/components/templates/wedding-v3/theme-packs/section-themes";

type SectionThemePickerProps = {
  /** Selectable section themes from the active template definition. */
  themes: SectionTheme[];
  /** Label for the "no section theme" option (the template's default look). */
  classicLabel: string;
  /** Swatch color representing the default look (its signature surface color). */
  classicSwatch: string;
  /** Currently selected sectionThemeId; `undefined` selects the classic default. */
  value: string | undefined;
  /** Called with the chosen id, or `undefined` for the classic default. */
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
};

/**
 * Lets an organizer pick a curated *section theme* (which recolors a
 * template's feature surfaces as a group) or keep the template default. The
 * first option is always the default (maps to `sectionThemeId = undefined`);
 * the rest come from the template definition's `sectionThemes`.
 */
export function SectionThemePicker({
  themes,
  classicLabel,
  classicSwatch,
  value,
  onChange,
  disabled,
}: SectionThemePickerProps) {
  const options: { id: string | undefined; label: string; swatch: string }[] = [
    { id: undefined, label: classicLabel, swatch: classicSwatch },
    ...themes.map((t) => ({ id: t.id, label: t.label, swatch: t.panel })),
  ];

  return (
    <div role="radiogroup" aria-label="Section theme" className="flex flex-wrap gap-3">
      {options.map((opt) => {
        const isActive = value === opt.id;
        // Checkmark color that reads on this swatch — a dark check on a light
        // swatch (e.g. the "Light" default), white on a dark one.
        // Decide polarity with the same shared test the generator uses (so the
        // swatch preview matches how the real surfaces flip), then render a
        // softened near-black stroke on light swatches, white on dark ones.
        const checkStroke =
          HEX6_RE.test(opt.swatch) && isLightColor(opt.swatch)
            ? "#111111"
            : "#ffffff";
        return (
          <button
            key={opt.id ?? "__classic__"}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            title={opt.label}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2",
              isActive
                ? "border-foreground shadow-sm"
                : "border-border hover:border-foreground/30",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span
              className={cn(
                "relative h-10 w-10 rounded-full border-2",
                isActive ? "border-foreground" : "border-foreground/40",
              )}
              style={{ backgroundColor: opt.swatch }}
            >
              {isActive && (
                <svg
                  className="absolute inset-0 m-auto h-4 w-4 drop-shadow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={checkStroke}
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
