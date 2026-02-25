"use client";

import { useCallback } from "react";
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
export function RegistryEditor({ data, onChange }: RegistryEditorProps) {
  const items = data.items || [];

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
          <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
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
