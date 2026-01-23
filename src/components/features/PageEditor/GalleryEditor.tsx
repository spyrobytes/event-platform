"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GallerySection } from "@/schemas/event-page";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type GalleryItem = {
  assetId: string;
  caption?: string;
  title?: string;
  moment?: string;
};

type GalleryEditorProps = {
  data: GallerySection["data"];
  assets: Asset[];
  onChange: (data: GallerySection["data"]) => void;
  maxImages?: number;
};

/**
 * Editor for gallery section with per-image annotations and display settings
 * Supports story-telling gallery with captions, titles, and moments
 */
export function GalleryEditor({
  data,
  assets,
  onChange,
  maxImages = 20,
}: GalleryEditorProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Filter to only gallery assets
  const galleryAssets = assets.filter((a) => a.kind === "GALLERY");

  // Get current items (from new items array or legacy assetIds)
  const currentItems: GalleryItem[] = data.items && data.items.length > 0
    ? data.items
    : (data.assetIds || []).map((assetId) => ({ assetId }));

  const selectedIds = currentItems.map((item) => item.assetId);

  // Update items in the data
  const updateItems = useCallback(
    (newItems: GalleryItem[]) => {
      onChange({
        ...data,
        items: newItems,
        // Keep assetIds in sync for backward compatibility
        assetIds: newItems.map((item) => item.assetId),
      });
    },
    [data, onChange]
  );

  const toggleImage = useCallback(
    (assetId: string) => {
      if (selectedIds.includes(assetId)) {
        // Remove
        updateItems(currentItems.filter((item) => item.assetId !== assetId));
      } else {
        // Add (if under limit)
        if (selectedIds.length < maxImages) {
          updateItems([...currentItems, { assetId }]);
        }
      }
    },
    [currentItems, selectedIds, maxImages, updateItems]
  );

  const moveImage = useCallback(
    (assetId: string, direction: "up" | "down") => {
      const currentIndex = currentItems.findIndex((item) => item.assetId === assetId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= currentItems.length) return;

      const newItems = [...currentItems];
      [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];
      updateItems(newItems);
    },
    [currentItems, updateItems]
  );

  const removeImage = useCallback(
    (assetId: string) => {
      updateItems(currentItems.filter((item) => item.assetId !== assetId));
      if (editingItemId === assetId) {
        setEditingItemId(null);
      }
    },
    [currentItems, editingItemId, updateItems]
  );

  const updateItemMetadata = useCallback(
    (assetId: string, updates: Partial<GalleryItem>) => {
      updateItems(
        currentItems.map((item) =>
          item.assetId === assetId ? { ...item, ...updates } : item
        )
      );
    },
    [currentItems, updateItems]
  );

  // Get selected assets in order with their metadata
  const selectedAssets = currentItems
    .map((item) => {
      const asset = assets.find((a) => a.id === item.assetId);
      return asset ? { ...item, asset } : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Get available assets (not selected)
  const availableAssets = galleryAssets.filter((a) => !selectedIds.includes(a.id));

  // Get the item being edited
  const editingItem = editingItemId
    ? selectedAssets.find((a) => a.assetId === editingItemId)
    : null;

  if (galleryAssets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No gallery images uploaded yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload images in the media section to add them to your gallery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gallery Settings */}
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h4 className="text-sm font-medium">Gallery Settings</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Heading */}
          <div className="space-y-2">
            <Label htmlFor="gallery-heading">Section Heading</Label>
            <Input
              id="gallery-heading"
              value={data.heading || ""}
              onChange={(e) => onChange({ ...data, heading: e.target.value })}
              placeholder="Gallery"
              maxLength={60}
            />
          </div>

          {/* Display Mode */}
          <div className="space-y-2">
            <Label htmlFor="display-mode">Display Mode</Label>
            <select
              id="display-mode"
              value={data.displayMode || "grid"}
              onChange={(e) =>
                onChange({
                  ...data,
                  displayMode: e.target.value as "grid" | "carousel" | "masonry" | "slideshow",
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="grid">Grid</option>
              <option value="carousel">Carousel</option>
              <option value="masonry">Masonry</option>
              <option value="slideshow">Slideshow</option>
            </select>
          </div>

          {/* Transition Effect */}
          <div className="space-y-2">
            <Label htmlFor="transition">Transition Effect</Label>
            <select
              id="transition"
              value={data.transition || "fade"}
              onChange={(e) =>
                onChange({
                  ...data,
                  transition: e.target.value as "fade" | "slide" | "zoom" | "flip",
                })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="flip">Flip</option>
            </select>
          </div>

          {/* Auto-play Interval */}
          <div className="space-y-2">
            <Label htmlFor="autoplay-interval">Auto-play Interval (seconds)</Label>
            <Input
              id="autoplay-interval"
              type="number"
              min={2}
              max={15}
              value={data.autoPlayInterval || 5}
              onChange={(e) =>
                onChange({
                  ...data,
                  autoPlayInterval: Math.min(15, Math.max(2, parseInt(e.target.value) || 5)),
                })
              }
              disabled={!data.autoPlay}
            />
          </div>
        </div>

        {/* Toggle options */}
        <div className="flex flex-wrap gap-6">
          {(() => {
            const isAutoPlayDisabled = !data.displayMode || data.displayMode === "grid" || data.displayMode === "masonry";
            return (
              <label className={`flex items-center gap-2 text-sm ${isAutoPlayDisabled ? "opacity-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={data.autoPlay || false}
                  onChange={(e) => onChange({ ...data, autoPlay: e.target.checked })}
                  className="rounded"
                  disabled={isAutoPlayDisabled}
                />
                Enable Auto-play
                {isAutoPlayDisabled && (
                  <span className="text-xs text-muted-foreground">(Slideshow/Carousel only)</span>
                )}
              </label>
            );
          })()}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.showCaptions !== false}
              onChange={(e) => onChange({ ...data, showCaptions: e.target.checked })}
              className="rounded"
            />
            Show Captions
          </label>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground">
        Click images to add them. Click the pencil icon on selected images to add captions and titles.
      </p>

      {/* Selected images */}
      {selectedAssets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Selected Images ({selectedAssets.length}/{maxImages})
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {selectedAssets.map((item, index) => (
              <div
                key={item.asset.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted",
                  editingItemId === item.assetId
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-primary"
                )}
              >
                {item.asset.publicUrl && (
                  <img
                    src={item.asset.publicUrl}
                    alt={item.asset.alt || `Gallery image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
                {/* Order badge */}
                <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                {/* Annotation indicator */}
                {(item.caption || item.title || item.moment) && (
                  <div className="absolute bottom-1 left-1 rounded-full bg-primary/90 p-1 text-primary-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                )}
                {/* Controls overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveImage(item.assetId, "up")}
                    disabled={index === 0}
                    className="rounded bg-white/20 p-1 text-white transition-colors hover:bg-white/40 disabled:opacity-50"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItemId(editingItemId === item.assetId ? null : item.assetId)}
                    className={cn(
                      "rounded p-1 text-white transition-colors",
                      editingItemId === item.assetId
                        ? "bg-primary hover:bg-primary/80"
                        : "bg-white/20 hover:bg-white/40"
                    )}
                    aria-label="Edit caption"
                    title="Edit caption and title"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(item.assetId, "down")}
                    disabled={index === selectedAssets.length - 1}
                    className="rounded bg-white/20 p-1 text-white transition-colors hover:bg-white/40 disabled:opacity-50"
                    aria-label="Move right"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(item.assetId)}
                    className="rounded bg-red-500/80 p-1 text-white transition-colors hover:bg-red-500"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotation Editor */}
      {editingItem && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Edit Image Details</h4>
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {editingItem.asset.publicUrl && (
                <img
                  src={editingItem.asset.publicUrl}
                  alt={editingItem.asset.alt}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="item-title" className="text-xs">Title</Label>
                <Input
                  id="item-title"
                  value={editingItem.title || ""}
                  onChange={(e) => updateItemMetadata(editingItem.assetId, { title: e.target.value })}
                  placeholder="e.g., First Dance"
                  maxLength={60}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-moment" className="text-xs">Moment/Date</Label>
                <Input
                  id="item-moment"
                  value={editingItem.moment || ""}
                  onChange={(e) => updateItemMetadata(editingItem.assetId, { moment: e.target.value })}
                  placeholder="e.g., June 2023 or The Proposal"
                  maxLength={30}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-caption" className="text-xs">Caption</Label>
                <Textarea
                  id="item-caption"
                  value={editingItem.caption || ""}
                  onChange={(e) => updateItemMetadata(editingItem.assetId, { caption: e.target.value })}
                  placeholder="Tell the story behind this moment..."
                  maxLength={200}
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {(editingItem.caption || "").length}/200 characters
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available images */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">
          {selectedAssets.length > 0 ? "Available Images" : "Select Images"}
          {availableAssets.length > 0 && ` (${availableAssets.length} available)`}
        </h4>
        {availableAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All gallery images are selected.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {availableAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggleImage(asset.id)}
                disabled={selectedIds.length >= maxImages}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-all",
                  selectedIds.length >= maxImages
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary hover:ring-2 hover:ring-primary/20"
                )}
              >
                {asset.publicUrl && (
                  <img
                    src={asset.publicUrl}
                    alt={asset.alt || "Gallery image"}
                    className="h-full w-full object-cover"
                  />
                )}
                {/* Add overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <span className="rounded-full bg-white/0 p-2 text-white opacity-0 transition-all group-hover:bg-white/20 group-hover:opacity-100">
                    +
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.length >= maxImages && (
        <p className="text-sm text-amber-600">
          Maximum {maxImages} images allowed in the gallery.
        </p>
      )}
    </div>
  );
}
