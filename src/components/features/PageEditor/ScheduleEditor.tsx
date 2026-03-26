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
  location?: string;
};

type ScheduleGroup = {
  label: string;
  date?: string;
  location?: string;
  items: ScheduleItem[];
};

type ScheduleEditorProps = {
  items: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
  groups?: ScheduleGroup[];
  onChangeGroups?: (groups: ScheduleGroup[] | undefined) => void;
  templateId?: string;
  maxItems?: number;
};

/**
 * Editor for schedule/agenda items.
 * V2 wedding template supports grouped mode (multi-day events).
 */
export function ScheduleEditor({
  items,
  onChange,
  groups,
  onChangeGroups,
  templateId,
  maxItems = 20,
}: ScheduleEditorProps) {
  const isV2 = templateId === "wedding_v2";
  const hasGroups = groups && groups.length > 0;

  // --- Flat item operations (legacy) ---
  const addItem = useCallback(() => {
    if (items.length >= maxItems) return;
    onChange([...items, { time: "", title: "" }]);
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

  // --- Group operations (V2) ---
  const addGroup = useCallback(() => {
    if (!onChangeGroups) return;
    const current = groups || [];
    if (current.length >= 6) return;
    onChangeGroups([...current, { label: "", items: [] }]);
  }, [groups, onChangeGroups]);

  const updateGroup = useCallback(
    (gi: number, updates: Partial<ScheduleGroup>) => {
      if (!onChangeGroups || !groups) return;
      const newGroups = [...groups];
      newGroups[gi] = { ...newGroups[gi], ...updates };
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  const removeGroup = useCallback(
    (gi: number) => {
      if (!onChangeGroups || !groups) return;
      const filtered = groups.filter((_, i) => i !== gi);
      onChangeGroups(filtered.length > 0 ? filtered : undefined);
    },
    [groups, onChangeGroups]
  );

  const moveGroup = useCallback(
    (gi: number, direction: "up" | "down") => {
      if (!onChangeGroups || !groups) return;
      const newIndex = direction === "up" ? gi - 1 : gi + 1;
      if (newIndex < 0 || newIndex >= groups.length) return;
      const newGroups = [...groups];
      [newGroups[gi], newGroups[newIndex]] = [newGroups[newIndex], newGroups[gi]];
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  const addGroupItem = useCallback(
    (gi: number) => {
      if (!onChangeGroups || !groups) return;
      const group = groups[gi];
      if (group.items.length >= 10) return;
      const newGroups = [...groups];
      newGroups[gi] = { ...group, items: [...group.items, { time: "", title: "" }] };
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  const updateGroupItem = useCallback(
    (gi: number, ii: number, updates: Partial<ScheduleItem>) => {
      if (!onChangeGroups || !groups) return;
      const newGroups = [...groups];
      const newItems = [...newGroups[gi].items];
      newItems[ii] = { ...newItems[ii], ...updates };
      newGroups[gi] = { ...newGroups[gi], items: newItems };
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  const removeGroupItem = useCallback(
    (gi: number, ii: number) => {
      if (!onChangeGroups || !groups) return;
      const newGroups = [...groups];
      newGroups[gi] = {
        ...newGroups[gi],
        items: newGroups[gi].items.filter((_, i) => i !== ii),
      };
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  const moveGroupItem = useCallback(
    (gi: number, ii: number, direction: "up" | "down") => {
      if (!onChangeGroups || !groups) return;
      const newIndex = direction === "up" ? ii - 1 : ii + 1;
      const groupItems = groups[gi].items;
      if (newIndex < 0 || newIndex >= groupItems.length) return;
      const newItems = [...groupItems];
      [newItems[ii], newItems[newIndex]] = [newItems[newIndex], newItems[ii]];
      const newGroups = [...groups];
      newGroups[gi] = { ...newGroups[gi], items: newItems };
      onChangeGroups(newGroups);
    },
    [groups, onChangeGroups]
  );

  // V2 grouped mode
  if (isV2 && onChangeGroups) {
    return (
      <div className="space-y-4">
        {/* Grouped editor */}
        {hasGroups ? (
          <div className="space-y-6">
            {groups!.map((group, gi) => (
              <div key={gi} className="rounded-lg border-2 border-dashed p-4 space-y-4">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Day / Event {gi + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveGroup(gi, "up")} disabled={gi === 0} className="h-8 w-8 p-0" aria-label="Move group up">↑</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveGroup(gi, "down")} disabled={gi === groups!.length - 1} className="h-8 w-8 p-0" aria-label="Move group down">↓</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeGroup(gi)} className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Remove group">×</Button>
                  </div>
                </div>

                {/* Group meta fields */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={group.label}
                      onChange={(e) => updateGroup(gi, { label: e.target.value })}
                      placeholder="e.g., Traditional Ceremony"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date (optional)</Label>
                    <Input
                      value={group.date || ""}
                      onChange={(e) => updateGroup(gi, { date: e.target.value || undefined })}
                      placeholder="e.g., Friday, Dec 13"
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Venue (optional)</Label>
                    <Input
                      value={group.location || ""}
                      onChange={(e) => updateGroup(gi, { location: e.target.value || undefined })}
                      placeholder="e.g., Grand Hotel Ballroom"
                      maxLength={200}
                    />
                  </div>
                </div>

                {/* Group items */}
                <div className="space-y-3 pl-3 border-l-2 border-muted">
                  {group.items.map((item, ii) => (
                    <ScheduleItemRow
                      key={ii}
                      item={item}
                      index={ii}
                      total={group.items.length}
                      prefix={`g${gi}-`}
                      onUpdate={(updates) => updateGroupItem(gi, ii, updates)}
                      onRemove={() => removeGroupItem(gi, ii)}
                      onMove={(dir) => moveGroupItem(gi, ii, dir)}
                      showLocation
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addGroupItem(gi)}
                    disabled={group.items.length >= 10}
                    className="w-full text-xs"
                  >
                    + Add Item{group.items.length >= 10 && " (max 10)"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat items (legacy data or not yet grouped) */
          <>
            {items.length > 0 && (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <ScheduleItemRow
                    key={index}
                    item={item}
                    index={index}
                    total={items.length}
                    prefix=""
                    onUpdate={(updates) => updateItem(index, updates)}
                    onRemove={() => removeItem(index)}
                    onMove={(dir) => moveItem(index, dir)}
                  />
                ))}
              </div>
            )}
            {items.length === 0 && !hasGroups && (
              <p className="text-sm text-muted-foreground">
                No schedule items yet. Add individual items or create day groups for multi-day celebrations.
              </p>
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
          </>
        )}

        {/* Add group button */}
        <Button
          type="button"
          variant="outline"
          onClick={addGroup}
          disabled={(groups || []).length >= 6}
          className="w-full"
        >
          + Add Day / Event Group
          {(groups || []).length >= 6 && " (max 6)"}
        </Button>
        {!hasGroups && items.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Tip: Add a day group to organize a multi-day celebration. Flat items above will still display if no groups are added.
          </p>
        )}
      </div>
    );
  }

  // Non-V2: flat items only
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No schedule items yet. Add your first item below.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <ScheduleItemRow
              key={index}
              item={item}
              index={index}
              total={items.length}
              prefix=""
              onUpdate={(updates) => updateItem(index, updates)}
              onRemove={() => removeItem(index)}
              onMove={(dir) => moveItem(index, dir)}
            />
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

/** Reusable schedule item row used in both flat and grouped modes */
function ScheduleItemRow({
  item,
  index,
  total,
  prefix,
  onUpdate,
  onRemove,
  onMove,
  showLocation,
}: {
  item: ScheduleItem;
  index: number;
  total: number;
  prefix: string;
  onUpdate: (updates: Partial<ScheduleItem>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  showLocation?: boolean;
}) {
  return (
    <div className="relative rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Item {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onMove("up")} disabled={index === 0} className="h-8 w-8 p-0" aria-label="Move up">↑</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onMove("down")} disabled={index === total - 1} className="h-8 w-8 p-0" aria-label="Move down">↓</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label="Remove item">×</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}schedule-time-${index}`}>Time</Label>
          <Input
            id={`${prefix}schedule-time-${index}`}
            value={item.time}
            onChange={(e) => onUpdate({ time: e.target.value })}
            placeholder="e.g., 9:00 AM"
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}schedule-title-${index}`}>Title</Label>
          <Input
            id={`${prefix}schedule-title-${index}`}
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="e.g., Registration"
            maxLength={100}
          />
        </div>
      </div>

      {showLocation && (
        <div className="mt-3 space-y-2">
          <Label htmlFor={`${prefix}schedule-loc-${index}`}>
            Location <span className="text-muted-foreground">(optional — overrides day venue)</span>
          </Label>
          <Input
            id={`${prefix}schedule-loc-${index}`}
            value={item.location || ""}
            onChange={(e) => onUpdate({ location: e.target.value || undefined })}
            placeholder="e.g., St. Mary's Cathedral"
            maxLength={200}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Label htmlFor={`${prefix}schedule-desc-${index}`}>
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${prefix}schedule-desc-${index}`}
          value={item.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          placeholder="Additional details..."
          rows={2}
          maxLength={500}
        />
      </div>
    </div>
  );
}
