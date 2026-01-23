"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StorySection } from "@/schemas/event-page";

type StoryEditorProps = {
  data: StorySection["data"];
  onChange: (data: StorySection["data"]) => void;
};

/**
 * Editor for the Our Story section
 * Allows couples to share how they met
 */
export function StoryEditor({ data, onChange }: StoryEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="story-heading">Section Heading</Label>
        <Input
          id="story-heading"
          value={data.heading || "Our Story"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Our Story"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="story-content">Your Story</Label>
        <Textarea
          id="story-content"
          value={data.content || ""}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
          placeholder="Share how you met, your journey together, and what makes your love story special..."
          rows={8}
          maxLength={1500}
        />
        <p className="text-xs text-muted-foreground">
          {(data.content || "").length}/1500 characters (minimum 50)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="story-layout">Layout Style</Label>
        <select
          id="story-layout"
          value={data.layout || "full"}
          onChange={(e) =>
            onChange({ ...data, layout: e.target.value as "full" | "split" })
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="full">Full Width</option>
          <option value="split">Split (with image space)</option>
        </select>
      </div>
    </div>
  );
}
