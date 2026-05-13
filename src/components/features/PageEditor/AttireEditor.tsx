"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AttireExtras,
  AttireExtrasContactType,
  AttireExtrasVendor,
  AttireSection,
} from "@/schemas/event-page";

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
  const vendors = data.extras?.vendors ?? [];

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

  // --- Extras (vendors / tailors) ---
  const writeExtras = useCallback(
    (next: AttireExtras | undefined) => {
      onChange({ ...data, extras: next });
    },
    [data, onChange]
  );

  const updateExtrasTitle = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!data.extras) return; // can't set title before vendors exist
      writeExtras({
        ...data.extras,
        title: trimmed ? title : undefined,
      });
    },
    [data.extras, writeExtras]
  );

  const addVendor = useCallback(() => {
    if (vendors.length >= 4) return;
    const next: AttireExtrasVendor = { name: "" };
    const extras: AttireExtras = {
      title: data.extras?.title,
      vendors: [...vendors, next],
    };
    writeExtras(extras);
  }, [vendors, data.extras?.title, writeExtras]);

  const updateVendor = useCallback(
    (index: number, partial: Partial<AttireExtrasVendor>) => {
      if (!data.extras) return;
      const newVendors = vendors.map((v, i) =>
        i === index ? { ...v, ...partial } : v
      );
      writeExtras({ ...data.extras, vendors: newVendors });
    },
    [data.extras, vendors, writeExtras]
  );

  const removeVendor = useCallback(
    (index: number) => {
      const newVendors = vendors.filter((_, i) => i !== index);
      if (newVendors.length === 0) {
        writeExtras(undefined);
      } else {
        writeExtras({ title: data.extras?.title, vendors: newVendors });
      }
    },
    [vendors, data.extras?.title, writeExtras]
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
        <Label htmlFor="attire-icon">Icon Style</Label>
        <Select
          id="attire-icon"
          value={data.iconStyle || "auto"}
          onChange={(e) => onChange({ ...data, iconStyle: e.target.value as "auto" | "formal" | "casual" })}
        >
          <option value="auto">Auto (detected from dress code)</option>
          <option value="formal">Formal (bow tie)</option>
          <option value="casual">Casual (garment)</option>
        </Select>
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
          Add one color per field. Use a hex code (e.g.,{" "}
          <span className="font-mono">#2C5F7C</span>) for a colored swatch, or a
          color name for a text label.
        </p>

        {colors.length > 0 && (
          <div className="space-y-2">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={color}
                  onChange={(e) => updateColor(index, e.target.value)}
                  placeholder="#2C5F7C or Navy Blue"
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

      {/* Vendors / Tailors (optional extras card) */}
      <div className="space-y-3 pt-4 border-t">
        <div>
          <Label>Vendors / Tailors (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Add suppliers, tailors, or shops your guests can use. Shows as a
            separate card below the dress code on the published page.
          </p>
        </div>

        {vendors.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="attire-extras-title" className="text-xs">
              Card Title
            </Label>
            <Input
              id="attire-extras-title"
              value={data.extras?.title || ""}
              onChange={(e) => updateExtrasTitle(e.target.value)}
              placeholder="Where to Shop"
              maxLength={60}
            />
          </div>
        )}

        {vendors.map((vendor, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Vendor {i + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeVendor(i)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                aria-label="Remove vendor"
              >
                ×
              </Button>
            </div>
            <Input
              value={vendor.name}
              onChange={(e) => updateVendor(i, { name: e.target.value })}
              placeholder="e.g., Bride's Dress or Atelier Couture"
              maxLength={80}
            />
            <Textarea
              value={vendor.description || ""}
              onChange={(e) =>
                updateVendor(i, {
                  description: e.target.value || undefined,
                })
              }
              placeholder="Short description (optional)"
              rows={2}
              maxLength={200}
            />
            <div className="space-y-2 rounded-md bg-muted/30 p-2">
              <p className="text-xs font-medium text-muted-foreground">
                Contact (optional)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={vendor.contactLabel || ""}
                  onChange={(e) =>
                    updateVendor(i, {
                      contactLabel: e.target.value || undefined,
                    })
                  }
                  placeholder="Button label"
                  maxLength={40}
                  aria-label="Contact button label"
                />
                <Select
                  value={vendor.contactType || "url"}
                  onChange={(e) =>
                    updateVendor(i, {
                      contactType: e.target.value as AttireExtrasContactType,
                    })
                  }
                  aria-label="Contact type"
                >
                  <option value="url">Website (URL)</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="text">Text / Handle</option>
                </Select>
                <Input
                  value={vendor.contactValue || ""}
                  onChange={(e) =>
                    updateVendor(i, {
                      contactValue: e.target.value || undefined,
                    })
                  }
                  placeholder="https://, +1 555..., @handle"
                  maxLength={200}
                  aria-label="Contact value"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVendor}
          disabled={vendors.length >= 4}
        >
          + Add Vendor
          {vendors.length >= 4 && " (max 4)"}
        </Button>
      </div>
    </div>
  );
}
