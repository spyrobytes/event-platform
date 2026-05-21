"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Prelude, PreludeFont } from "@/schemas/event-page";

const MIN_BODY = 40;
const MAX_BODY = 280;
const MAX_HEADING = 40;
const MAX_SIGNATURE = 60;

const DEFAULT_PRELUDE: Prelude = {
  enabled: false,
  body: "",
  font: "romantic-script",
};

type PreludeEditorProps = {
  prelude: Prelude | undefined;
  onChange: (updates: Partial<Prelude>) => void;
};

type FontOption = {
  value: PreludeFont;
  label: string;
  description: string;
  preview: string;
  premium?: boolean;
};

const FONT_OPTIONS: FontOption[] = [
  {
    value: "romantic-script",
    label: "Romantic Script",
    description: "Formal flourished calligraphy (Great Vibes)",
    preview: "Welcome",
  },
  {
    value: "modern-script",
    label: "Modern Script",
    description: "Playful, casual cursive (Dancing Script)",
    preview: "Welcome",
    premium: true,
  },
];

/**
 * Editor for the Prelude (welcome note) — a top-level page field rendered
 * between the hero and the first section on supported wedding templates.
 *
 * Strongly constrained: a single short body in cursive, optional heading
 * (in the template's normal heading font), optional signature, choice of
 * two cursive font treatments.
 */
export function PreludeEditor({ prelude, onChange }: PreludeEditorProps) {
  const current = prelude ?? DEFAULT_PRELUDE;
  const bodyLength = current.body.length;
  const enabled = current.enabled;
  const showMinWarning = enabled && bodyLength > 0 && bodyLength < MIN_BODY;
  const showEmptyError = enabled && bodyLength === 0;

  const setFont = useCallback(
    (font: PreludeFont) => {
      onChange({ font });
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Use this space to warmly welcome your guests and set the tone for the
        celebration. Renders right after your Hero, before the rest of the page.
      </p>

      {/* Enable toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="rounded"
        />
        Enable Prelude
      </label>

      {/* Heading */}
      <div className="space-y-2">
        <Label htmlFor="prelude-heading">
          Section Heading <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="prelude-heading"
          value={current.heading || ""}
          onChange={(e) =>
            onChange({ heading: e.target.value || undefined })
          }
          placeholder="A note before we begin"
          maxLength={MAX_HEADING}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          {(current.heading || "").length}/{MAX_HEADING}
        </p>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="prelude-body">Welcome Note</Label>
        <Textarea
          id="prelude-body"
          value={current.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="As we begin this beautiful new chapter, we are grateful to celebrate with the people who mean the most to us. Your presence will make our day even more memorable."
          rows={5}
          maxLength={MAX_BODY}
          disabled={!enabled}
        />
        <p
          className={cn(
            "text-xs",
            showMinWarning || showEmptyError
              ? "text-amber-600"
              : "text-muted-foreground"
          )}
        >
          {bodyLength}/{MAX_BODY}
          {showEmptyError
            ? ` — a note is required when Prelude is enabled (minimum ${MIN_BODY})`
            : showMinWarning
              ? ` — minimum ${MIN_BODY} required (${MIN_BODY - bodyLength} more needed)`
              : ` (minimum ${MIN_BODY})`}
        </p>
      </div>

      {/* Signature */}
      <div className="space-y-2">
        <Label htmlFor="prelude-signature">
          Signature <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="prelude-signature"
          value={current.signature || ""}
          onChange={(e) =>
            onChange({ signature: e.target.value || undefined })
          }
          placeholder="— Sarah & David"
          maxLength={MAX_SIGNATURE}
          disabled={!enabled}
        />
        <p className="text-xs text-muted-foreground">
          {(current.signature || "").length}/{MAX_SIGNATURE}
        </p>
      </div>

      {/* Font picker */}
      <div className="space-y-2">
        <Label>Font Style</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_OPTIONS.map((option) => {
            const isSelected = current.font === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFont(option.value)}
                disabled={!enabled}
                aria-pressed={isSelected}
                className={cn(
                  "relative rounded-lg border-2 bg-surface p-4 text-left transition-all",
                  isSelected
                    ? "border-accent ring-2 ring-accent/20"
                    : "border-muted hover:border-muted-foreground",
                  !enabled && "cursor-not-allowed opacity-50"
                )}
              >
                {option.premium && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Premium
                  </span>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
