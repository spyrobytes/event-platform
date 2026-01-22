"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SpeakersSection, SpeakerItem, SpeakerLink } from "@/schemas/event-page";
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type SpeakersEditorProps = {
  data: SpeakersSection["data"];
  assets: Asset[];
  onChange: (data: SpeakersSection["data"]) => void;
  maxSpeakers?: number;
};

const LINK_TYPES: { value: SpeakerLink["type"]; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
];

/**
 * Editor for speakers/guests section
 * Allows editing section heading, description, and individual speaker items
 */
export function SpeakersEditor({
  data,
  assets,
  onChange,
  maxSpeakers = 12,
}: SpeakersEditorProps) {
  // Filter to speaker assets
  const speakerAssets = assets.filter((a) => a.kind === "SPEAKER");

  const updateField = useCallback(
    <K extends keyof SpeakersSection["data"]>(field: K, value: SpeakersSection["data"][K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const addSpeaker = useCallback(() => {
    if (data.items.length >= maxSpeakers) return;
    const newItem: SpeakerItem = { name: "" };
    updateField("items", [...data.items, newItem]);
  }, [data.items, maxSpeakers, updateField]);

  const updateSpeaker = useCallback(
    (index: number, updates: Partial<SpeakerItem>) => {
      const newItems = [...data.items];
      newItems[index] = { ...newItems[index], ...updates };
      updateField("items", newItems);
    },
    [data.items, updateField]
  );

  const removeSpeaker = useCallback(
    (index: number) => {
      updateField("items", data.items.filter((_, i) => i !== index));
    },
    [data.items, updateField]
  );

  const moveSpeaker = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= data.items.length) return;

      const newItems = [...data.items];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      updateField("items", newItems);
    },
    [data.items, updateField]
  );

  const addLink = useCallback(
    (speakerIndex: number) => {
      const speaker = data.items[speakerIndex];
      const currentLinks = speaker.links || [];
      if (currentLinks.length >= 4) return;

      const newLink: SpeakerLink = { type: "website", url: "" };
      updateSpeaker(speakerIndex, { links: [...currentLinks, newLink] });
    },
    [data.items, updateSpeaker]
  );

  const updateLink = useCallback(
    (speakerIndex: number, linkIndex: number, updates: Partial<SpeakerLink>) => {
      const speaker = data.items[speakerIndex];
      const newLinks = [...(speaker.links || [])];
      newLinks[linkIndex] = { ...newLinks[linkIndex], ...updates };
      updateSpeaker(speakerIndex, { links: newLinks });
    },
    [data.items, updateSpeaker]
  );

  const removeLink = useCallback(
    (speakerIndex: number, linkIndex: number) => {
      const speaker = data.items[speakerIndex];
      const newLinks = (speaker.links || []).filter((_, i) => i !== linkIndex);
      updateSpeaker(speakerIndex, { links: newLinks.length > 0 ? newLinks : undefined });
    },
    [data.items, updateSpeaker]
  );

  return (
    <div className="space-y-6">
      {/* Section Header Fields */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium">Section Settings</h4>
        <div className="space-y-2">
          <Label htmlFor="speakers-heading">Heading</Label>
          <Input
            id="speakers-heading"
            value={data.heading}
            onChange={(e) => updateField("heading", e.target.value)}
            placeholder="Speakers"
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="speakers-description">
            Description <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="speakers-description"
            value={data.description || ""}
            onChange={(e) => updateField("description", e.target.value || undefined)}
            placeholder="Meet our amazing speakers..."
            rows={2}
            maxLength={300}
          />
        </div>
      </div>

      {/* Speaker Items */}
      {data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No speakers added yet. Add your first speaker below.
        </p>
      ) : (
        <div className="space-y-4">
          {data.items.map((speaker, index) => {
            const speakerImage = speaker.imageAssetId
              ? assets.find((a) => a.id === speaker.imageAssetId)
              : null;

            return (
              <div
                key={index}
                className="relative rounded-lg border bg-card p-4"
              >
                {/* Item number and controls */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Speaker {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSpeaker(index, "up")}
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
                      onClick={() => moveSpeaker(index, "down")}
                      disabled={index === data.items.length - 1}
                      className="h-8 w-8 p-0"
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpeaker(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label="Remove speaker"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`speaker-name-${index}`}>Name *</Label>
                    <Input
                      id={`speaker-name-${index}`}
                      value={speaker.name}
                      onChange={(e) => updateSpeaker(index, { name: e.target.value })}
                      placeholder="John Smith"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`speaker-role-${index}`}>
                      Role <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={`speaker-role-${index}`}
                      value={speaker.role || ""}
                      onChange={(e) => updateSpeaker(index, { role: e.target.value || undefined })}
                      placeholder="Keynote Speaker"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`speaker-bio-${index}`}>
                    Bio <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id={`speaker-bio-${index}`}
                    value={speaker.bio || ""}
                    onChange={(e) => updateSpeaker(index, { bio: e.target.value || undefined })}
                    placeholder="A brief bio..."
                    rows={2}
                    maxLength={500}
                  />
                </div>

                {/* Image Selection */}
                <div className="mt-4 space-y-2">
                  <Label>Photo <span className="text-muted-foreground">(optional)</span></Label>
                  {speakerAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No speaker photos uploaded. Upload images in the media section with type &quot;Speaker&quot;.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateSpeaker(index, { imageAssetId: undefined })}
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-lg border-2 text-xs",
                          !speaker.imageAssetId
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-muted-foreground"
                        )}
                      >
                        None
                      </button>
                      {speakerAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => updateSpeaker(index, { imageAssetId: asset.id })}
                          className={cn(
                            "relative h-16 w-16 overflow-hidden rounded-lg border-2",
                            speaker.imageAssetId === asset.id
                              ? "border-primary"
                              : "border-muted hover:border-muted-foreground"
                          )}
                        >
                          {asset.publicUrl && (
                            <img
                              src={asset.publicUrl}
                              alt={asset.alt || "Speaker photo"}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="mt-4 space-y-2">
                  <Label>Social Links <span className="text-muted-foreground">(optional)</span></Label>
                  {(speaker.links || []).map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-2">
                      <select
                        value={link.type}
                        onChange={(e) => updateLink(index, linkIndex, { type: e.target.value as SpeakerLink["type"] })}
                        className="h-10 w-32 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {LINK_TYPES.map((lt) => (
                          <option key={lt.value} value={lt.value}>
                            {lt.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(index, linkIndex, { url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(index, linkIndex)}
                        className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                        aria-label="Remove link"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {(speaker.links || []).length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLink(index)}
                    >
                      + Add Link
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Speaker Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addSpeaker}
        disabled={data.items.length >= maxSpeakers}
        className="w-full"
      >
        + Add Speaker
        {data.items.length >= maxSpeakers && ` (max ${maxSpeakers})`}
      </Button>
    </div>
  );
}
