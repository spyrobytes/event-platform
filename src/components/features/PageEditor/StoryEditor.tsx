"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StorySection, Milestone } from "@/schemas/event-page";

type Asset = {
  id: string;
  kind: string;
  tags: string[];
  publicUrl: string | null;
  alt: string;
};

type StoryEditorProps = {
  data: StorySection["data"];
  assets: Asset[];
  onChange: (data: StorySection["data"]) => void;
  templateId?: string;
};

/**
 * Editor for the Our Story section
 * Allows couples to share how they met
 */
export function StoryEditor({ data, assets, onChange, templateId }: StoryEditorProps) {
  // Story panels accept story-tagged or gallery-tagged photos
  const galleryAssets = assets.filter((a) =>
    a.tags.some((t) => t === "story" || t === "gallery")
  );
  const isSplitLayout = data.layout === "split";
  const isV2 = templateId === "wedding_v2";
  const isTimelineLayout = data.layout === "timeline";
  const milestones = data.milestones || [];

  const addMilestone = useCallback(() => {
    if (milestones.length >= 8) return;
    onChange({
      ...data,
      milestones: [...milestones, { year: "", title: "", description: "" }],
    });
  }, [data, milestones, onChange]);

  const updateMilestone = useCallback(
    (index: number, updates: Partial<Milestone>) => {
      const newMilestones = [...milestones];
      newMilestones[index] = { ...newMilestones[index], ...updates };
      onChange({ ...data, milestones: newMilestones });
    },
    [data, milestones, onChange]
  );

  const removeMilestone = useCallback(
    (index: number) => {
      onChange({
        ...data,
        milestones: milestones.filter((_, i) => i !== index),
      });
    },
    [data, milestones, onChange]
  );

  const moveMilestone = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= milestones.length) return;
      const newMilestones = [...milestones];
      [newMilestones[index], newMilestones[newIndex]] = [
        newMilestones[newIndex],
        newMilestones[index],
      ];
      onChange({ ...data, milestones: newMilestones });
    },
    [data, milestones, onChange]
  );

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
        <p className={`text-xs ${(data.content || "").length > 0 && (data.content || "").length < 50 ? "text-amber-600" : "text-muted-foreground"}`}>
          {(data.content || "").length}/1500 characters
          {(data.content || "").length > 0 && (data.content || "").length < 50
            ? ` (minimum 50 required — ${50 - (data.content || "").length} more needed)`
            : " (minimum 50)"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="story-layout">Layout Style</Label>
        <Select
          id="story-layout"
          value={data.layout || "full"}
          onChange={(e) =>
            onChange({
              ...data,
              layout: e.target.value as "full" | "split" | "timeline",
              // Clear image if switching to full layout
              imageAssetId:
                e.target.value === "full" ? undefined : data.imageAssetId,
            })
          }
        >
          <option value="full">Full Width</option>
          <option value="split">Split (with image)</option>
          {isV2 && <option value="timeline">Timeline (with milestones)</option>}
        </Select>
      </div>

      {/* Image selection - only show for split layout */}
      {isSplitLayout && (
        <div className="space-y-2">
          <Label>Story Image</Label>
          <p className="text-xs text-muted-foreground">
            Select an image to display alongside your story
          </p>
          {galleryAssets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...data, imageAssetId: undefined })}
                className={`h-20 w-20 rounded border-2 p-2 transition-all ${
                  !data.imageAssetId
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-muted-foreground"
                }`}
                title={data.imageAssetId ? "Clear selection" : "No image selected"}
              >
                <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                  <svg
                    className="mb-1 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {data.imageAssetId ? "Clear" : "None"}
                </div>
              </button>
              {galleryAssets.map((asset) => {
                const isSelected = data.imageAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onChange({ ...data, imageAssetId: asset.id })}
                    aria-pressed={isSelected}
                    className={`relative h-20 w-20 overflow-hidden rounded border-2 transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-muted hover:border-muted-foreground"
                    }`}
                    title={asset.alt || "Select image"}
                  >
                    {asset.publicUrl && (
                      <img
                        src={asset.publicUrl}
                        alt={asset.alt}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No images available. Upload images in the Media Library above to
                use them here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Milestones Editor - only show for timeline layout on V2 */}
      {isV2 && isTimelineLayout && (
        <div className="space-y-3">
          <Label>Timeline Milestones</Label>
          <p className="text-xs text-muted-foreground">
            Add key moments in your journey together
          </p>

          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No milestones added yet. Add dates and moments from your story.
            </p>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Milestone {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveMilestone(index, "up")}
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
                        onClick={() => moveMilestone(index, "down")}
                        disabled={index === milestones.length - 1}
                        className="h-8 w-8 p-0"
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label="Remove milestone"
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-year-${index}`}>Year / Date</Label>
                        <Input
                          id={`milestone-year-${index}`}
                          value={milestone.year}
                          onChange={(e) =>
                            updateMilestone(index, { year: e.target.value })
                          }
                          placeholder="e.g., 2019"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-title-${index}`}>Title</Label>
                        <Input
                          id={`milestone-title-${index}`}
                          value={milestone.title}
                          onChange={(e) =>
                            updateMilestone(index, { title: e.target.value })
                          }
                          placeholder="e.g., First Date"
                          maxLength={60}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`milestone-desc-${index}`}>Description</Label>
                      <Textarea
                        id={`milestone-desc-${index}`}
                        value={milestone.description}
                        onChange={(e) =>
                          updateMilestone(index, { description: e.target.value })
                        }
                        placeholder="A brief description of this moment..."
                        rows={2}
                        maxLength={200}
                      />
                    </div>

                    {/* Milestone Image */}
                    <div className="space-y-2">
                      <Label>Image (optional)</Label>
                      {galleryAssets.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateMilestone(index, { imageAssetId: undefined })
                            }
                            className={`h-16 w-16 rounded border-2 p-1 transition-all ${
                              !milestone.imageAssetId
                                ? "border-primary bg-primary/10"
                                : "border-muted hover:border-muted-foreground"
                            }`}
                            title={milestone.imageAssetId ? "Clear" : "None"}
                          >
                            <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                              <svg
                                className="mb-0.5 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {milestone.imageAssetId ? "Clear" : "None"}
                            </div>
                          </button>
                          {galleryAssets.map((asset) => {
                            const isSelected = milestone.imageAssetId === asset.id;
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() =>
                                  updateMilestone(index, { imageAssetId: asset.id })
                                }
                                aria-pressed={isSelected}
                                className={`relative h-16 w-16 overflow-hidden rounded border-2 transition-all ${
                                  isSelected
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-muted hover:border-muted-foreground"
                                }`}
                                title={asset.alt || "Select image"}
                              >
                                {asset.publicUrl && (
                                  <img
                                    src={asset.publicUrl}
                                    alt={asset.alt}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                {isSelected && (
                                  <span
                                    aria-hidden="true"
                                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                                  >
                                    <svg
                                      className="h-2.5 w-2.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Upload images in the Media Library to add photos
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={addMilestone}
            disabled={milestones.length >= 8}
            className="w-full"
          >
            + Add Milestone
            {milestones.length >= 8 && " (max 8)"}
          </Button>
        </div>
      )}
    </div>
  );
}
