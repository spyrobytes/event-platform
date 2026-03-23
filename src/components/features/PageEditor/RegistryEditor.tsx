"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RegistrySection } from "@/schemas/event-page";

type RegistryEditorProps = {
  data: RegistrySection["data"];
  assets: Array<{
    id: string;
    kind: string;
    publicUrl: string | null;
  }>;
  onChange: (data: RegistrySection["data"]) => void;
};

/**
 * Editor for Gift Registry section
 * Allows managing registry items with names, URLs, and logos
 */
export function RegistryEditor({ data, assets, onChange }: RegistryEditorProps) {
  const items = data.items || [];
  const logoAssets = assets.filter((a) => a.kind === "GALLERY");

  const addItem = useCallback(() => {
    if (items.length >= 6) return;
    onChange({
      ...data,
      items: [...items, { name: "" }],
    });
  }, [data, items, onChange]);

  const updateItem = useCallback(
    (index: number, updates: Partial<(typeof items)[number]>) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], ...updates };
      onChange({ ...data, items: newItems });
    },
    [data, items, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      onChange({
        ...data,
        items: items.filter((_, i) => i !== index),
      });
    },
    [data, items, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="registry-heading">Section Heading</Label>
        <Input
          id="registry-heading"
          value={data.heading || "Gift Registry"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Gift Registry"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="registry-description">Description (optional)</Label>
        <Textarea
          id="registry-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
          placeholder="Your presence is the greatest gift, but if you wish to honor us..."
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Registry Items */}
      <div className="space-y-3">
        <Label>Registry Items</Label>
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="e.g., Amazon, Crate & Barrel"
                  maxLength={100}
                />
                <Input
                  value={item.url || ""}
                  onChange={(e) => updateItem(index, { url: e.target.value || undefined })}
                  placeholder="https://registry-url.com (optional)"
                  type="url"
                />
                {item.url && (() => { try { new URL(item.url); return false; } catch { return true; } })() && (
                  <p className="text-xs text-amber-600">Please enter a valid URL (e.g., https://...)</p>
                )}
                <Input
                  value={item.description || ""}
                  onChange={(e) => updateItem(index, { description: e.target.value || undefined })}
                  placeholder="Brief description (optional)"
                  maxLength={200}
                />
                <Input
                  value={item.note || ""}
                  onChange={(e) => updateItem(index, { note: e.target.value || undefined })}
                  placeholder="Note, e.g., Ships internationally (optional)"
                  maxLength={200}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="mt-1 h-8 w-8 p-0 text-destructive hover:text-destructive"
                aria-label="Remove registry item"
              >
                ×
              </Button>
            </div>

            {/* Logo Picker */}
            {logoAssets.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Logo (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateItem(index, { logoAssetId: undefined })}
                    className={cn(
                      "h-10 w-10 rounded border-2 p-0.5 transition-all text-xs",
                      !item.logoAssetId
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground"
                    )}
                    title={item.logoAssetId ? "Clear logo" : "No logo"}
                  >
                    <span className="text-muted-foreground">—</span>
                  </button>
                  {logoAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => updateItem(index, { logoAssetId: asset.id })}
                      className={cn(
                        "h-10 w-10 overflow-hidden rounded border-2 transition-all",
                        item.logoAssetId === asset.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-muted hover:border-muted-foreground"
                      )}
                      title="Select logo"
                    >
                      {asset.publicUrl && (
                        <img
                          src={asset.publicUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={items.length >= 6}
        >
          + Add Registry
          {items.length >= 6 && " (max 6)"}
        </Button>
      </div>
    </div>
  );
}
