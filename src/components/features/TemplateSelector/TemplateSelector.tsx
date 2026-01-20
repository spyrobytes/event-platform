"use client";

import { cn } from "@/lib/utils";
import type { TemplateId } from "@/schemas/event";

export type TemplateInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  previewColors: {
    primary: string;
    background: string;
  };
  icon: string;
};

/**
 * Available templates with their metadata
 * This is kept in sync with the TEMPLATES registry and seed data
 */
export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    id: "wedding_v1",
    name: "Classic Wedding",
    category: "wedding",
    description: "Elegant and romantic design for wedding celebrations",
    previewColors: {
      primary: "#B76E79",
      background: "#FDF8F8",
    },
    icon: "💒",
  },
  {
    id: "conference_v1",
    name: "Modern Conference",
    category: "conference",
    description: "Professional layout for corporate events and seminars",
    previewColors: {
      primary: "#2563EB",
      background: "#F8FAFC",
    },
    icon: "🎤",
  },
  {
    id: "party_v1",
    name: "Celebration Party",
    category: "party",
    description: "Vibrant and fun design for birthdays and celebrations",
    previewColors: {
      primary: "#F59E0B",
      background: "#FFFBEB",
    },
    icon: "🎉",
  },
];

type TemplateSelectorProps = {
  value: string | null;
  onChange: (templateId: string) => void;
  disabled?: boolean;
  showDescription?: boolean;
  size?: "compact" | "normal" | "large";
};

/**
 * Template selection component
 * Displays available templates as cards with preview styling
 */
export function TemplateSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  size = "normal",
}: TemplateSelectorProps) {
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
    <div
      className={cn(
        "grid gap-4",
        size === "compact" ? "grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
      role="radiogroup"
      aria-label="Select a template"
    >
      {TEMPLATE_INFO.map((template) => {
        const isSelected = value === template.id;

        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(template.id)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
              sizeClasses[size],
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-60"
            )}
            style={{
              backgroundColor: template.previewColors.background,
              "--tw-ring-color": template.previewColors.primary,
            } as React.CSSProperties}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: template.previewColors.primary }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Template preview */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg",
                  iconSizes[size],
                  size === "compact" ? "h-10 w-10" : "h-12 w-12"
                )}
                style={{ backgroundColor: `${template.previewColors.primary}20` }}
              >
                {template.icon}
              </div>
              <div className="flex-1">
                <h3
                  className={cn(
                    "font-semibold",
                    size === "compact" ? "text-sm" : "text-base"
                  )}
                  style={{ color: template.previewColors.primary }}
                >
                  {template.name}
                </h3>
                <p className="text-xs capitalize text-muted-foreground">
                  {template.category}
                </p>
              </div>
            </div>

            {/* Description */}
            {showDescription && size !== "compact" && (
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            )}

            {/* Preview bar */}
            <div
              className={cn(
                "mt-auto rounded-full",
                size === "compact" ? "h-1" : "h-1.5"
              )}
              style={{ backgroundColor: template.previewColors.primary }}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get template info by ID
 */
export function getTemplateInfo(templateId: string): TemplateInfo | undefined {
  return TEMPLATE_INFO.find((t) => t.id === templateId);
}

/**
 * Get default template ID
 */
export function getDefaultTemplateId(): TemplateId {
  return "wedding_v1";
}
