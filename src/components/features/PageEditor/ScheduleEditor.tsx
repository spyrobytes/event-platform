"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ScheduleItem = {
  time: string;
  title: string;
  description?: string;
};

type ScheduleEditorProps = {
  items: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
  maxItems?: number;
};

/**
 * Editor for schedule/agenda items
 * Allows adding, editing, removing, and reordering schedule items
 */
export function ScheduleEditor({
  items,
  onChange,
  maxItems = 20,
}: ScheduleEditorProps) {
  const addItem = useCallback(() => {
    if (items.length >= maxItems) return;
    onChange([...items, { time: "", title: "", description: "" }]);
  }, [items, maxItems, onChange]);

  const updateItem = useCallback(
    (index: number, updates: Partial<ScheduleItem>) => {
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
          No schedule items yet. Add your first item below.
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
                  Item {index + 1}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`schedule-time-${index}`}>Time</Label>
                  <Input
                    id={`schedule-time-${index}`}
                    value={item.time}
                    onChange={(e) => updateItem(index, { time: e.target.value })}
                    placeholder="e.g., 9:00 AM"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`schedule-title-${index}`}>Title</Label>
                  <Input
                    id={`schedule-title-${index}`}
                    value={item.title}
                    onChange={(e) => updateItem(index, { title: e.target.value })}
                    placeholder="e.g., Registration"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor={`schedule-desc-${index}`}>
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`schedule-desc-${index}`}
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, { description: e.target.value || undefined })
                  }
                  placeholder="Additional details..."
                  rows={2}
                  maxLength={500}
                />
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
        + Add Schedule Item
        {items.length >= maxItems && ` (max ${maxItems})`}
      </Button>
    </div>
  );
}
