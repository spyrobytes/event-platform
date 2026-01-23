"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AttireSection } from "@/schemas/event-page";

type AttireEditorProps = {
  data: AttireSection["data"];
  onChange: (data: AttireSection["data"]) => void;
};

const DRESS_CODE_PRESETS = [
  "Black Tie",
  "Black Tie Optional",
  "Formal",
  "Cocktail",
  "Semi-Formal",
  "Dressy Casual",
  "Beach Formal",
  "Garden Party",
  "Festive",
  "Casual",
];

/**
 * Editor for Attire/Dress Code section
 * Allows specifying dress code and suggested colors
 */
export function AttireEditor({ data, onChange }: AttireEditorProps) {
  const colors = data.colors || [];

  const addColor = useCallback(() => {
    if (colors.length >= 6) return;
    onChange({
      ...data,
      colors: [...colors, ""],
    });
  }, [data, colors, onChange]);

  const updateColor = useCallback(
    (index: number, value: string) => {
      const newColors = [...colors];
      newColors[index] = value;
      onChange({ ...data, colors: newColors });
    },
    [data, colors, onChange]
  );

  const removeColor = useCallback(
    (index: number) => {
      onChange({
        ...data,
        colors: colors.filter((_, i) => i !== index),
      });
    },
    [data, colors, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="attire-heading">Section Heading</Label>
        <Input
          id="attire-heading"
          value={data.heading || "Dress Code"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Dress Code"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attire-dresscode">Dress Code</Label>
        <div className="flex gap-2">
          <Input
            id="attire-dresscode"
            value={data.dressCode || ""}
            onChange={(e) => onChange({ ...data, dressCode: e.target.value })}
            placeholder="e.g., Cocktail Attire"
            maxLength={50}
            className="flex-1"
          />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onChange({ ...data, dressCode: e.target.value });
              }
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Quick pick...</option>
            {DRESS_CODE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attire-notes">Additional Notes (optional)</Label>
        <Textarea
          id="attire-notes"
          value={data.notes || ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Any additional guidance for guests about what to wear, weather considerations, etc."
          rows={3}
          maxLength={500}
        />
      </div>

      {/* Suggested Colors */}
      <div className="space-y-2">
        <Label>Suggested Colors (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Help guests coordinate by suggesting colors for their attire
        </p>

        {colors.length > 0 && (
          <div className="space-y-2">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={color}
                  onChange={(e) => updateColor(index, e.target.value)}
                  placeholder="e.g., Navy Blue, Blush Pink"
                  maxLength={30}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColor(index)}
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                  aria-label="Remove color"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addColor}
          disabled={colors.length >= 6}
        >
          + Add Suggested Color
          {colors.length >= 6 && " (max 6)"}
        </Button>
      </div>
    </div>
  );
}
