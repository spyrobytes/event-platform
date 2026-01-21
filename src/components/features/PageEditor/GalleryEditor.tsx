"use client";

import { useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
};

type GalleryEditorProps = {
  selectedIds: string[];
  assets: Asset[];
  onChange: (ids: string[]) => void;
  maxImages?: number;
};

/**
 * Editor for gallery image selection
 * Allows selecting and ordering images from uploaded assets
 */
export function GalleryEditor({
  selectedIds,
  assets,
  onChange,
  maxImages = 20,
}: GalleryEditorProps) {
  // Filter to only gallery assets
  const galleryAssets = assets.filter((a) => a.kind === "GALLERY");

  const toggleImage = useCallback(
    (assetId: string) => {
      if (selectedIds.includes(assetId)) {
        // Remove
        onChange(selectedIds.filter((id) => id !== assetId));
      } else {
        // Add (if under limit)
        if (selectedIds.length < maxImages) {
          onChange([...selectedIds, assetId]);
        }
      }
    },
    [selectedIds, maxImages, onChange]
  );

  const moveImage = useCallback(
    (assetId: string, direction: "up" | "down") => {
      const currentIndex = selectedIds.indexOf(assetId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= selectedIds.length) return;

      const newIds = [...selectedIds];
      [newIds[currentIndex], newIds[newIndex]] = [newIds[newIndex], newIds[currentIndex]];
      onChange(newIds);
    },
    [selectedIds, onChange]
  );

  const removeImage = useCallback(
    (assetId: string) => {
      onChange(selectedIds.filter((id) => id !== assetId));
    },
    [selectedIds, onChange]
  );

  // Get selected assets in order
  const selectedAssets = selectedIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is Asset => a !== undefined);

  // Get available assets (not selected)
  const availableAssets = galleryAssets.filter((a) => !selectedIds.includes(a.id));

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
      {/* Selected images */}
      {selectedAssets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Selected Images ({selectedAssets.length}/{maxImages})
          </h4>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {selectedAssets.map((asset, index) => (
              <div
                key={asset.id}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-primary bg-muted"
              >
                {asset.publicUrl && (
                  <Image
                    src={asset.publicUrl}
                    alt={asset.alt || `Gallery image ${index + 1}`}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                )}
                {/* Order badge */}
                <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                {/* Controls overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveImage(asset.id, "up")}
                    disabled={index === 0}
                    className="rounded bg-white/20 p-1 text-white transition-colors hover:bg-white/40 disabled:opacity-50"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(asset.id, "down")}
                    disabled={index === selectedAssets.length - 1}
                    className="rounded bg-white/20 p-1 text-white transition-colors hover:bg-white/40 disabled:opacity-50"
                    aria-label="Move right"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(asset.id)}
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
                  <Image
                    src={asset.publicUrl}
                    alt={asset.alt || "Gallery image"}
                    fill
                    sizes="150px"
                    className="object-cover"
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
