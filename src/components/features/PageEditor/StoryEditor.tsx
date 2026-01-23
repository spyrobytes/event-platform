"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StorySection } from "@/schemas/event-page";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  alt: string;
};

type StoryEditorProps = {
  data: StorySection["data"];
  assets: Asset[];
  onChange: (data: StorySection["data"]) => void;
};

/**
 * Editor for the Our Story section
 * Allows couples to share how they met
 */
export function StoryEditor({ data, assets, onChange }: StoryEditorProps) {
  const galleryAssets = assets.filter((a) => a.kind === "GALLERY");
  const isSplitLayout = data.layout === "split";

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
            onChange({
              ...data,
              layout: e.target.value as "full" | "split",
              // Clear image if switching to full layout
              imageAssetId:
                e.target.value === "full" ? undefined : data.imageAssetId,
            })
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="full">Full Width</option>
          <option value="split">Split (with image)</option>
        </select>
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
              {galleryAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onChange({ ...data, imageAssetId: asset.id })}
                  className={`h-20 w-20 overflow-hidden rounded border-2 transition-all ${
                    data.imageAssetId === asset.id
                      ? "border-primary ring-2 ring-primary/20"
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
                </button>
              ))}
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
    </div>
  );
}
