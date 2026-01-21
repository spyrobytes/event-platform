"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FAQItem = {
  q: string;
  a: string;
};

type FAQEditorProps = {
  items: FAQItem[];
  onChange: (items: FAQItem[]) => void;
  maxItems?: number;
};

/**
 * Editor for FAQ items
 * Allows adding, editing, removing, and reordering FAQ items
 */
export function FAQEditor({
  items,
  onChange,
  maxItems = 10,
}: FAQEditorProps) {
  const addItem = useCallback(() => {
    if (items.length >= maxItems) return;
    onChange([...items, { q: "", a: "" }]);
  }, [items, maxItems, onChange]);

  const updateItem = useCallback(
    (index: number, updates: Partial<FAQItem>) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], ...updates };
      onChange(newItems);
    },
    [items, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return;

      const newItems = [...items];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      onChange(newItems);
    },
    [items, onChange]
  );

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No FAQ items yet. Add your first question below.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative rounded-lg border bg-card p-4"
            >
              {/* Item number and controls */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Q{index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, "down")}
                    disabled={index === items.length - 1}
                    className="h-8 w-8 p-0"
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    aria-label="Remove item"
                  >
                    ×
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`faq-q-${index}`}>Question</Label>
                  <Input
                    id={`faq-q-${index}`}
                    value={item.q}
                    onChange={(e) => updateItem(index, { q: e.target.value })}
                    placeholder="e.g., What should I wear?"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`faq-a-${index}`}>Answer</Label>
                  <Textarea
                    id={`faq-a-${index}`}
                    value={item.a}
                    onChange={(e) => updateItem(index, { a: e.target.value })}
                    placeholder="e.g., Business casual attire is recommended."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addItem}
        disabled={items.length >= maxItems}
        className="w-full"
      >
        + Add FAQ Item
        {items.length >= maxItems && ` (max ${maxItems})`}
      </Button>
    </div>
  );
}
