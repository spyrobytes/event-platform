"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  ThingsToDoSection,
  ActivityItem,
  ActivityCategory,
} from "@/schemas/event-page";

type ThingsToDoEditorProps = {
  data: ThingsToDoSection["data"];
  onChange: (data: ThingsToDoSection["data"]) => void;
};

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "food", label: "Food & Dining" },
  { value: "attraction", label: "Attractions" },
  { value: "activity", label: "Activities" },
  { value: "shopping", label: "Shopping" },
  { value: "nature", label: "Nature & Outdoors" },
];

/**
 * Editor for Things To Do section
 * Allows adding local attractions and activities for guests
 */
export function ThingsToDoEditor({ data, onChange }: ThingsToDoEditorProps) {
  const items = data.items || [];

  const addItem = useCallback(() => {
    if (items.length >= 12) return;
    onChange({
      ...data,
      items: [...items, { name: "" }],
    });
  }, [data, items, onChange]);

  const updateItem = useCallback(
    (index: number, updates: Partial<ActivityItem>) => {
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

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= items.length) return;

      const newItems = [...items];
      [newItems[index], newItems[newIndex]] = [
        newItems[newIndex],
        newItems[index],
      ];
      onChange({ ...data, items: newItems });
    },
    [data, items, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="thingstodo-heading">Section Heading</Label>
        <Input
          id="thingstodo-heading"
          value={data.heading || "Things To Do"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Things To Do"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thingstodo-description">Description (optional)</Label>
        <Textarea
          id="thingstodo-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Help your out-of-town guests explore the area..."
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Activities List */}
      <div className="space-y-2">
        <Label>Local Recommendations</Label>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recommendations added yet. Share your favorite local spots with
            your guests.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="relative rounded-lg border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}. {item.name || "New recommendation"}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`activity-name-${index}`}>Name</Label>
                      <Input
                        id={`activity-name-${index}`}
                        value={item.name}
                        onChange={(e) =>
                          updateItem(index, { name: e.target.value })
                        }
                        placeholder="e.g., The Blue Fig Cafe"
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`activity-category-${index}`}>
                        Category
                      </Label>
                      <select
                        id={`activity-category-${index}`}
                        value={item.category || ""}
                        onChange={(e) =>
                          updateItem(index, {
                            category:
                              (e.target.value as ActivityCategory) || undefined,
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select category...</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-description-${index}`}>
                      Description (optional)
                    </Label>
                    <Textarea
                      id={`activity-description-${index}`}
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(index, { description: e.target.value })
                      }
                      placeholder="What makes this place special..."
                      rows={2}
                      maxLength={300}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`activity-address-${index}`}>
                        Address (optional)
                      </Label>
                      <Input
                        id={`activity-address-${index}`}
                        value={item.address || ""}
                        onChange={(e) =>
                          updateItem(index, { address: e.target.value })
                        }
                        placeholder="123 Main St"
                        maxLength={200}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`activity-url-${index}`}>
                        Website (optional)
                      </Label>
                      <Input
                        id={`activity-url-${index}`}
                        type="url"
                        value={item.website || ""}
                        onChange={(e) =>
                          updateItem(index, { website: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
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
          disabled={items.length >= 12}
          className="w-full"
        >
          + Add Recommendation
          {items.length >= 12 && " (max 12)"}
        </Button>
      </div>
    </div>
  );
}
